---
title: EGO Data Collection with Meta Quest 3
summary: First-person data collection with no handheld hardware: a neck-worn Meta Quest 3 records stereo video, hand skeletons and palm trajectories, and two-handed gestures drive UMI's recording state machine.
role: Designed and built the setup: the Quest app (UVC camera capture, hand-tracking export, gesture recognition and the recording state machine), signal checks in simulation and on a real robot, and the recording pipeline.
brief: A neck-worn Quest alone records bare-hand demonstrations as stereo video, hand skeletons and palm trajectories, with gestures to start, stop and label them.
facts: 3 → 1 :: devices recording each Episode (UMI → EGO) || 21 :: keypoints per hand (MediaPipe layout) || 6-DoF :: Palm Pose per hand, recorded instead of the wrist pose || ≈ 1 s :: two-hand hold to start or stop recording
---

## Summary

EGO records first-person demonstrations of bare-handed tasks with a single Meta Quest 3 worn around the neck. Each Episode holds stereo video, both hands' skeletons and palm trajectories, and a label. Its predecessor, UMI, needs three devices per Episode.

Human egocentric data scales better than robot data because anyone can record it, anywhere, without holding a gripper. Bare hands, however, leave the headset no buttons to read and no controllers to track.

The Quest app converts OpenXR hand joints to the MediaPipe layout and records the 6-DoF Palm Pose. A stereo UVC camera plugs into the headset over USB-C and is captured by the app itself. Holding both fists for ≈1 s starts or stops recording.

Three checks validated the signals first. The converted Hand Skeleton drove a simulated Wuji hand in MuJoCo. The Palm Pose drove a real robot arm. The stereo camera was configured and previewed entirely in the Quest app.

The gestures feed UMI's state machine, so both systems produce Episodes the same way. Episodes also upload over Wi-Fi through the same pipeline as UMI.

## From UMI to EGO

EGO grew out of my [UMI Data Collection](#/projects/umi-data-collection) system. There, a Quest and two grippers, each with a Raspberry Pi 4, record every Episode. EGO keeps the headset state machine and drops all the hardware the hands used to hold.

| | UMI Data Collection | EGO Data Collection |
| --- | --- | --- |
| Hands | Handheld grippers | Bare hands, tracked by the Quest |
| Pose signal | Quest controllers mounted on the grippers | Palm Pose from hand tracking |
| Hand state | Gripper State from ArUco markers | Hand Skeleton, 21 keypoints per hand |
| Cameras | Two wrist cameras per gripper + head stereo camera | Stereo camera on the headset |
| Commands | Membrane keyboard → Pi → BLE | Two-handed Gesture Commands |
| Compute | Quest + one Raspberry Pi per gripper | Quest only |
| Recording logic | State machine on the Quest | **The same** state machine |

One Quest replaces three devices and runs the whole recording pipeline. Gestures replace the membrane keyboard, so the hands stay free for the task.

## System Architecture

The headset hangs around the neck, so its stereo camera looks down at the hands and table from chest height. The operator's face stays uncovered, and the Quest still tracks both hands.

<figure class="figure-media">
<a href="./images/projects/ego/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/ego/architecture.svg" alt="EGO system diagram: on the Meta Quest 3, the stereo UVC camera feeds the video recorder; hand tracking feeds the Hand Skeleton and Palm Pose export and the gesture recognizer; the gesture recognizer drives the recording state machine, which starts and stops the recorders. Episodes upload over Wi-Fi to a lab server" loading="lazy"></a>
<figcaption>Everything runs on the Quest: camera capture, hand tracking, gesture recognition, and the recording state machine shared with UMI.</figcaption>
</figure>

<details>
<summary>Gesture commands and state machine</summary>

The recognizer classifies each hand's pose as Rock, Paper or Thumb. A command fires only when both hands hold the pose briefly. Ordinary hand movements during a task therefore don't trigger commands.

| Gesture | Command |
| --- | --- |
| Both fists, held ≈1 s | Start / stop recording |
| Both thumbs up | Label the Episode as **success** |

The commands feed the same state machine as UMI:

```
Idle ──start──▶ Recording ──stop──▶ Review ──label──▶ Uploading ──▶ Idle
```

</details>

## Signal Validation

Each stream was checked before recording hours of data, because a dataset is only as useful as its worst signal.

### Hand Skeleton → Simulated Hand

The Quest reports OpenXR hand joints, but most hand-retargeting and learning code expects the MediaPipe 21-keypoint layout. The app converts each hand to a MediaPipe Hand Skeleton and retargets it onto a Wuji dexterous hand in MuJoCo. The test passes if the simulated fingers follow smoothly through open hands, pinches and fists.

<figure class="figure-media">
<video data-src="./images/projects/ego/wuji-sim-teleop.mp4" muted loop playsinline preload="none" aria-label="Headset view: the operator moves a hand while a simulated Wuji dexterous hand on the monitor copies the finger motion"></video>
<figcaption>The simulated Wuji hand copies my finger motion through the converted Hand Skeleton. Headset view, with the simulated hand on the monitor. 2× speed.</figcaption>
</figure>

### Palm Pose → Robot Arm

Hand tracking also reports a wrist joint, but the palm center was steadier in testing. EGO therefore records the 6-DoF Palm Pose. A robot arm followed it during bare-hand teleoperation through my [VR teleoperation platform](#/projects/vr-teleoperation).

<figure class="figure-media">
<video data-src="./images/projects/ego/palm-teleop.mp4" muted loop playsinline preload="none" aria-label="Bare-hand teleoperation: the operator's hand moves with its tracked axes overlaid, and the robot arm follows"></video>
<figcaption>The robot arm follows the tracked Palm Pose, drawn as axes on the hand. 1.5× speed. Faces in the background are blurred.</figcaption>
</figure>

### Stereo UVC Capture on Quest

EGO records from a stereo UVC camera on the headset, not the Quest's built-in cameras. No extra computer is involved.

<figure class="figure-media">
<video data-src="./images/projects/ego/camera-setup.mp4" muted loop playsinline preload="none" aria-label="In the Quest app: configuring the stereo UVC camera and opening a live preview"></video>
<figcaption>The Quest app sets up the stereo camera on its own. I pick the camera, left- and right-eye streams and target frame rate, then open a live preview. 4× speed. Faces are blurred.</figcaption>
</figure>

## Recording an Episode

<figure class="figure-media">
<video data-src="./images/projects/ego/recording-demo.mp4" muted loop playsinline preload="none" aria-label="Headset view of recording an Episode: setting the task, then folding a towel with both hands while gesture labels float in view"></video>
<figcaption>The gesture recognizer runs live throughout a recording, seen here through the headset. The floating words ("PaperRight", "RockPoseLeft", "ThumbPose…") are its output. 1.5× speed. Faces are blurred.</figcaption>
</figure>

<figure class="figure-media">
<video class="wide-stereo" data-src="./images/projects/ego/stereo-view.mp4" muted loop playsinline preload="none" aria-label="Left and right camera views side by side, showing the operator folding a towel from chest height"></video>
<figcaption>Left and right views of the same moment give depth for learning. Side-by-side stereo from the headset camera during a towel-folding Episode. Faces in the background are blurred.</figcaption>
</figure>

<figure class="figure-media">
<video data-src="./images/projects/ego/third-person.mp4" muted loop playsinline preload="none" aria-label="Third-person view of a data collector folding a towel with the headset worn around the neck; captions mark the start, stop and label gestures"></video>
<figcaption>Gestures alone start, stop and label an Episode. Here a data collector folds a towel: both fists to <strong>start</strong>, both fists again to <strong>stop</strong>, both thumbs up for <strong>success</strong>. Face blurred for privacy.</figcaption>
</figure>

## Related

- [UMI Data Collection](#/projects/umi-data-collection): the handheld-gripper system EGO is built on
- [VR teleoperation](#/projects/vr-teleoperation): the platform used for the Palm Pose robot test
