import AVFoundation
import CoreLocation
import Foundation
import React
import UIKit

/**
 Takes one photograph, at a known place, and hands back what the hash is computed over.

 ## Why this presents a screen rather than exposing a preview component

 A React Native camera *view* means a Fabric component, a shadow node, layout
 negotiation and a lifecycle that has to survive being unmounted mid-session.
 What Keys needs is narrower: one photograph, taken deliberately, with a
 location attached. A view controller presented for the length of that
 interaction is a fraction of the surface and cannot be left running by a
 screen that forgot to unmount it.

 ## There is no gallery picker, and there will not be

 The entire mechanism rests on bytes that came out of *this* camera. A picker
 alongside it would be a hole with a button on it — and a hole the app itself
 advertises. If this cannot open, the capture fails; it does not offer to find
 a photograph somewhere else.

 ## What comes back

 A greyscale grid, not a JPEG. It is what the perceptual hash reads and what
 the signature covers — the photograph a tenant eventually sees is a separate
 upload to object storage, and keeping them apart means the thing being
 *hashed* is small, deterministic, and free of any encoder's choices.
 */
@objc(KeysCapture)
final class KeysCapture: NSObject {
  @objc static func requiresMainQueueSetup() -> Bool { true }

  private var pending: (resolve: RCTPromiseResolveBlock, reject: RCTPromiseRejectBlock)?
  private var controller: CaptureController?

  @objc(capture:rejecter:)
  func capture(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      guard self.pending == nil else {
        reject("keys_capture_busy", "A capture is already open.", nil)
        return
      }
      /*
        Refused before anything is presented, not after.

        The first version discovered the missing camera inside `viewDidLoad`
        and called its completion there — which ran `dismiss` while the
        presentation was still animating, so nothing dismissed and the agent
        was left on a black screen with no way out. A simulator has no camera,
        so this was the *only* path that ran there.

        Whatever can be known before presenting is checked before presenting.
        Do not put up a screen you already know will fail.
      */
      guard AVCaptureDevice.default(for: .video) != nil else {
        reject(
          "keys_capture_no_camera",
          "This device has no camera Keys can use.",
          nil
        )
        return
      }

      guard
        let root = UIApplication.shared.connectedScenes
          .compactMap({ ($0 as? UIWindowScene)?.keyWindow })
          .first?.rootViewController
      else {
        reject("keys_capture_no_window", "There is no screen to present on.", nil)
        return
      }

      self.pending = (resolve, reject)
      let controller = CaptureController { [weak self] result in
        guard let self, let pending = self.pending else { return }
        self.pending = nil
        self.controller = nil
        root.dismiss(animated: true)

        switch result {
        case let .success(payload): pending.resolve(payload)
        case let .failure(error): pending.reject("keys_capture", error.what, nil)
        }
      }
      self.controller = controller
      controller.modalPresentationStyle = .fullScreen
      root.present(controller, animated: true)
    }
  }
}

/// What went wrong, in words the app can show an agent.
struct CaptureFailure: Error {
  let what: String
}

private final class CaptureController: UIViewController,
  AVCapturePhotoCaptureDelegate, CLLocationManagerDelegate
{
  private let session = AVCaptureSession()
  private let output = AVCapturePhotoOutput()
  private let locations = CLLocationManager()
  private let finished: (Result<[String: Any], CaptureFailure>) -> Void

  private var located: CLLocation?
  private var shutter: UIButton?

  init(finished: @escaping (Result<[String: Any], CaptureFailure>) -> Void) {
    self.finished = finished
    super.init(nibName: nil, bundle: nil)
  }

  required init?(coder: NSCoder) { fatalError("not from a nib") }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black

    locations.delegate = self
    locations.desiredAccuracy = kCLLocationAccuracyBest
    locations.requestWhenInUseAuthorization()
    locations.startUpdatingLocation()

    guard
      let camera = AVCaptureDevice.default(for: .video),
      let input = try? AVCaptureDeviceInput(device: camera),
      session.canAddInput(input),
      session.canAddOutput(output)
    else {
      /*
        The camera existed a moment ago and does not now — another app took it,
        or it failed. Reported after the presentation has settled, because a
        completion that runs during the animation cannot dismiss what is still
        appearing, and the result is a black screen nobody can leave.

        The alternative to failing is a gallery picker, and a picker is the
        hole this whole mechanism exists to close.
      */
      DispatchQueue.main.async { [weak self] in
        self?.finished(.failure(CaptureFailure(
          what: "Keys could not open the camera. Close any other app using it and try again."
        )))
      }
      return
    }

    session.addInput(input)
    session.addOutput(output)

    let preview = AVCaptureVideoPreviewLayer(session: session)
    preview.videoGravity = .resizeAspectFill
    preview.frame = view.bounds
    view.layer.addSublayer(preview)

    let button = UIButton(type: .system)
    button.setTitle("Take the photo", for: .normal)
    button.setTitleColor(.black, for: .normal)
    button.backgroundColor = .white
    button.layer.cornerRadius = 28
    button.translatesAutoresizingMaskIntoConstraints = false
    button.addTarget(self, action: #selector(take), for: .touchUpInside)
    view.addSubview(button)
    shutter = button

    let cancel = UIButton(type: .system)
    cancel.setTitle("Cancel", for: .normal)
    cancel.setTitleColor(.white, for: .normal)
    cancel.translatesAutoresizingMaskIntoConstraints = false
    cancel.addTarget(self, action: #selector(abandon), for: .touchUpInside)
    view.addSubview(cancel)

    NSLayoutConstraint.activate([
      // 56 points high, comfortably past the 44 minimum, and above the home
      // indicator rather than under a thumb reaching for it.
      button.heightAnchor.constraint(equalToConstant: 56),
      button.widthAnchor.constraint(equalToConstant: 220),
      button.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      button.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -32),
      cancel.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor, constant: 20),
      cancel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 12),
      cancel.heightAnchor.constraint(equalToConstant: 44),
    ])

    DispatchQueue.global(qos: .userInitiated).async { [session] in
      session.startRunning()
    }
  }

  override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    session.stopRunning()
    locations.stopUpdatingLocation()
  }

  @objc private func abandon() {
    finished(.failure(CaptureFailure(what: "Cancelled.")))
  }

  @objc private func take() {
    /*
      Refused without a location rather than captured with none.

      `provesPresence` in the domain treats a null distance as failure, so a
      capture with no location can never satisfy anything. Taking it anyway
      would mean an agent standing at a property, doing the right thing, and
      getting a photograph that silently counts for nothing.
    */
    guard located != nil else {
      finished(.failure(CaptureFailure(
        what: "Keys needs your location to prove where this was taken. Allow it and try again."
      )))
      return
    }
    shutter?.isEnabled = false
    output.capturePhoto(with: AVCapturePhotoSettings(), delegate: self)
  }

  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    located = locations.last
  }

  func photoOutput(
    _ output: AVCapturePhotoOutput,
    didFinishProcessingPhoto photo: AVCapturePhoto,
    error: Error?
  ) {
    guard error == nil, let data = photo.fileDataRepresentation(),
          let image = UIImage(data: data)?.cgImage
    else {
      finished(.failure(CaptureFailure(what: "That photo did not come out. Try again.")))
      return
    }
    guard let location = located else {
      finished(.failure(CaptureFailure(what: "Keys lost your location before the photo saved.")))
      return
    }

    /*
      Whether the operating system thinks this location was faked.

      `isSimulatedBySoftware` is what a location spoofer trips. It goes into
      the signed claim rather than beside it, so a modified client cannot flip
      it — and the server refuses a mocked capture outright, because nobody
      runs a spoofer by accident while photographing a flat.
    */
    let mocked: Bool
    if #available(iOS 15.0, *) {
      mocked = location.sourceInformation?.isSimulatedBySoftware ?? false
    } else {
      mocked = false
    }

    finished(.success([
      "pixels": KeysCapture.grid(from: image).base64EncodedString(),
      "latitude": location.coordinate.latitude,
      "longitude": location.coordinate.longitude,
      "mockLocation": mocked,
      "capturedAt": ISO8601DateFormatter.keys.string(from: Date()),
    ]))
  }
}

extension ISO8601DateFormatter {
  /**
   Milliseconds, because that is what `toISOString` emits and what the server
   reformats before verifying. A timestamp with more precision on one side than
   the other is a signature over a different string — a `bad_signature` on a
   capture that is entirely genuine.
   */
  static let keys: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    formatter.timeZone = TimeZone(identifier: "UTC")
    return formatter
  }()
}

extension KeysCapture {
  /**
   The photograph as the grid `dHash` reads: `KEYSGREY`, width, height, one
   byte a pixel.

   Downscaled to 320 across. The perceptual hash sees a nine-by-eight
   thumbnail, so anything beyond a few hundred pixels is detail it throws away
   — and this grid is uploaded, hashed and signed, so every pixel past what
   the hash can use is bandwidth an agent pays for on a Nigerian network.
   */
  static func grid(from image: CGImage) -> Data {
    let width = 320
    let height = max(1, Int((Double(image.height) / Double(image.width)) * Double(width)))

    var pixels = [UInt8](repeating: 0, count: width * height)
    let context = CGContext(
      data: &pixels,
      width: width,
      height: height,
      bitsPerComponent: 8,
      bytesPerRow: width,
      space: CGColorSpaceCreateDeviceGray(),
      bitmapInfo: CGImageAlphaInfo.none.rawValue
    )
    context?.interpolationQuality = .high
    context?.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))

    var out = Data("KEYSGREY".utf8)
    out.append(contentsOf: [UInt8(width >> 8), UInt8(width & 0xff)])
    out.append(contentsOf: [UInt8(height >> 8), UInt8(height & 0xff)])
    out.append(contentsOf: pixels)
    return out
  }
}
