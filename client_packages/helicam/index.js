// Helicam script
// Made by: https://github.com/devsponsor
// For orders, bugs, suggestions, etc. contact me on Discord: devsponsor
// For orders, bugs, suggestions, etc. contact me on Telegram: devsponsor


let fov_max = 80.0;
let fov_min = 10.0; // max zoom level (smaller fov is more zoom)
let zoomspeed = 2.0; // camera zoom speed
let speed_lr = 3.0; // speed by which the camera pans left-right
let speed_ud = 3.0; // speed by which the camera pans up-down
let toggle_vision = 25; // control id to toggle vision mode. Default: INPUT_AIM (Right mouse btn)
let toggle_lock_on = 22; // control id to lock onto a vehicle with the camera. Default is INPUT_SPRINT (spacebar)

let helicam = false;
let fov = (fov_max + fov_min) * 0.5;
let vision_state = 0; // 0 is normal, 1 is nightmode, 2 is thermal vision

let cam;

let locked_on_vehicle = null;

mp.events.add("enablehelicam", () => {
  if (helicam) {
    mp.game.invoke("0x0F07E7745A236711");
    mp.game.invoke("0x31B73D1EA9F01DA2");
    mp.game.cam.renderScriptCams(false, false, 0, true, false);
    if (scaleform != null || scaleform != 0) {
      mp.game.graphics.setScaleformMovieAsNoLongerNeeded(scaleform);
    }

    if (cam != null) {
      cam.destroy(true);
      cam = null;
    }

    helicam = false;
    mp.game.graphics.setSeethrough(false);
    mp.game.graphics.setNightvision(false);
    vision_state = 0;
    locked_on_vehicle = null;
    vehicle_detected = null;
  } else {
    mp.game.graphics.setTimecycleModifier("heliGunCam");
    mp.game.graphics.setTimecycleModifierStrength(0.3);

    scaleform = mp.game.graphics.requestScaleformMovie("HELI_CAM");
    while (!mp.game.graphics.hasScaleformMovieLoaded(scaleform))
      mp.game.wait(0);

    let lPed = mp.players.local;
    let heli = lPed.vehicle;
    cam = mp.cameras.new(
      "DEFAULT_SCRIPTED_FLY_CAMERA",
      lPed.position,
      new mp.Vector3(0, 0, mp.players.local.getHeading()),
      60
    );
    cam.setActive(true);
    cam.setRot(0.0, 0.0, heli.getHeading(), 2);
    cam.setFov(fov);
    mp.game.cam.renderScriptCams(true, false, 0, true, false);
    cam.attachTo(heli.handle, 0.0, 0.0, -1.5, true);

    mp.game.graphics.pushScaleformMovieFunction(scaleform, "SET_CAM_LOGO");
    mp.game.graphics.pushScaleformMovieFunctionParameterInt(1);
    mp.game.graphics.popScaleformMovieFunctionVoid();

    helicam = true;
  }
});

mp.events.add("render", () => {
  if (helicam) {
    if (cam !== null && cam.isActive() && cam.isRendering()) {
      mp.game.controls.disableAllControlActions(2);

      var x = mp.game.controls.getDisabledControlNormal(7, 1) * speed_lr;
      var y = mp.game.controls.getDisabledControlNormal(7, 2) * speed_ud;
      var zoomIn = mp.game.controls.getDisabledControlNormal(2, 40) * zoomspeed;
      var zoomOut =
        mp.game.controls.getDisabledControlNormal(2, 41) * zoomspeed;

      var currentRot = cam.getRot(2);

      currentRot = new mp.Vector3(currentRot.x - y, 0, currentRot.z - x);

      cam.setRot(currentRot.x, currentRot.y, currentRot.z, 2);

      if (zoomIn > 0) {
        var currentFov = cam.getFov();
        currentFov -= zoomIn;
        if (currentFov < fov_min) currentFov = fov_min;
        cam.setFov(currentFov);
      } else if (zoomOut > 0) {
        var currentFov = cam.getFov();
        currentFov += zoomOut;
        if (currentFov > fov_max) currentFov = fov_max;
        cam.setFov(currentFov);
      }
    }

    if (mp.game.controls.isDisabledControlJustPressed(0, toggle_vision)) {
      mp.game.audio.playSoundFrontend(
        -1,
        "SELECT",
        "HUD_FRONTEND_DEFAULT_SOUNDSET",
        false
      );
      ChangeVision();
    }

    if (locked_on_vehicle) {
      if (locked_on_vehicle.handle != 0) {
        cam.pointAt(locked_on_vehicle.handle, 0, 0, 0, true);
        RenderVehicleInfo(locked_on_vehicle);
        if (mp.game.controls.isDisabledControlJustPressed(0, toggle_lock_on)) {
          mp.game.audio.playSoundFrontend(
            -1,
            "SELECT",
            "HUD_FRONTEND_DEFAULT_SOUNDSET",
            false
          );
          locked_on_vehicle = null;
          let lPed = mp.players.local;
          let heli = lPed.vehicle;
          var currentRot = cam.getRot(2);
          var currentFov = cam.getFov();
          let oldcam = cam;
          oldcam.destroy();
          cam = mp.cameras.new(
            "DEFAULT_SCRIPTED_FLY_CAMERA",
            lPed.position,
            new mp.Vector3(0, 0, mp.players.local.getHeading()),
            60
          );
          cam.setActive(true);
          cam.setRot(0.0, 0.0, heli.getHeading(), 2);
          cam.setFov(fov);
          mp.game.cam.renderScriptCams(true, false, 0, true, false);
          cam.attachTo(heli.handle, 0.0, 0.0, -1.5, true);
        }
      } else {
        locked_on_vehicle = null;
        let lPed = mp.players.local;
        let heli = lPed.vehicle;
        var currentRot = cam.getRot(2);
        var currentFov = cam.getFov();
        let oldcam = cam;
        oldcam.destroy();
        cam = mp.cameras.new(
          "DEFAULT_SCRIPTED_FLY_CAMERA",
          lPed.position,
          new mp.Vector3(0, 0, mp.players.local.getHeading()),
          60
        );
        cam.setActive(true);
        cam.setRot(0.0, 0.0, heli.getHeading(), 2);
        cam.setFov(fov);
        mp.game.cam.renderScriptCams(true, false, 0, true, false);
        cam.attachTo(heli.handle, 0.0, 0.0, -1.5, true);
      }
    } else {
      let vehicle_detected = pointingAt(cam);
      if (vehicle_detected != null && vehicle_detected.handle != 0) {
        if (mp.game.controls.isDisabledControlJustPressed(0, toggle_lock_on)) {
          mp.game.audio.playSoundFrontend(
            -1,
            "SELECT",
            "HUD_FRONTEND_DEFAULT_SOUNDSET",
            false
          );
          locked_on_vehicle = vehicle_detected;
        }
      }
    }

    mp.game.graphics.pushScaleformMovieFunction(
      scaleform,
      "SET_ALT_FOV_HEADING"
    );
    mp.game.graphics.pushScaleformMovieFunctionParameterFloat(
      mp.players.local.vehicle.position.z
    );
    mp.game.graphics.pushScaleformMovieFunctionParameterFloat(currentFov);
    mp.game.graphics.pushScaleformMovieFunctionParameterFloat(cam.getRot(2).z);

    mp.game.graphics.popScaleformMovieFunctionVoid();

    mp.game.graphics.drawScaleformMovieFullscreen(
      scaleform,
      255,
      255,
      255,
      255,
      true
    );
  }
});

function ChangeVision() {
  switch (vision_state) {
    case 0:
      mp.game.graphics.setNightvision(true);
      vision_state = 1;
      break;
    case 1:
      mp.game.graphics.setSeethrough(true);
      vision_state = 2;
      break;
    default:
      mp.game.graphics.setSeethrough(false);
      mp.game.graphics.setNightvision(false);
      vision_state = 0;
  }
}

Math.degrees = radians => radians * 180 / Math.PI;

function RenderVehicleInfo(vehicle) {
  let vehname = mp.game.ui.getLabelText(
    mp.game.vehicle.getDisplayNameFromVehicleModel(vehicle.model)
  );
  let licenseplate = vehicle.getNumberPlateText();

  mp.game.graphics.drawText(
    "Model: " + vehname + "\n Plate: " + licenseplate,
    [0.5, 0.9],
    {
      font: 0,
      color: [255, 255, 255, 185],
      scale: [0.0, 0.55],
      outline: true,
    }
  );
}

function pointingAt(camera) {
  let distance = 100;
  let position = camera.getCoord();
  let direction = camera.getDirection();
  let farAway = new mp.Vector3(
    direction.x * distance + position.x,
    direction.y * distance + position.y,
    direction.z * distance + position.z
  );

  mp.game.graphics.drawLine(
    position.x,
    position.y,
    position.z,
    farAway.x,
    farAway.y,
    farAway.z,
    255,
    0,
    0,
    255
  ); // Is in line of sight
  let result = mp.raycasting.testPointToPoint(position, farAway, [1, 16]);

  if (result) {
    if (result.entity.handle === localPlayer.handle) return null;
    if (result.entity.type === "vehicle") {
      return result.entity;
    }
    return null;
  }
  return null;
}

function RotAnglesToVec(rot) {
  let z = rot.z;
  let x = rot.x;
  return new mp.Vector3(
    -Math.sin(z) * Math.cos(x),
    Math.cos(z) * Math.cos(x),
    Math.sin(x)
  );
}
