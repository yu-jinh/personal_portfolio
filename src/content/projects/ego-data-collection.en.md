---
title: EGO Data Collection with Meta Quest 3
summary: A first-person data collection setup with no handheld hardware. A Meta Quest 3 worn around the neck records a stereo camera, both hands' skeletons and palm trajectories, and two-handed gestures drive the same recording state machine as the UMI device.
role: Designed and built the setup: the Quest app (UVC camera capture, hand-tracking export, gesture recognition and the recording state machine), the signal checks in simulation and on a real robot, and the recording pipeline.
brief: First-person demonstrations with bare hands: a neck-worn Quest records stereo video, hand skeletons and palm trajectories, with recording started, stopped and labelled by gestures.
facts: 21 :: keypoints per hand (MediaPipe layout) || ≈ 1 s :: two-hand gesture hold to start or stop
---

## At a glance

- **What:** First-person recordings of people doing tasks with their own hands: stereo video, plus the 3D motion of both hands
- **Why:** Human egocentric data scales far better than robot data. Anyone can record it, anywhere, with no gripper to hold.
- **Main parts:** Quest 3 worn around the neck · stereo UVC camera captured by the headset · OpenXR hand joints recast into the MediaPipe 21-keypoint layout · Palm Pose instead of wrist pose · two-handed gesture commands · the same state machine and upload pipeline as UMI

## From UMI to EGO

EGO grew out of my [UMI Data Collection](#/projects/umi-data-collection) system. There, every Episode is recorded by three devices at once: a **Meta Quest 3** tracks the head and two controllers, and each of two **handheld grippers** records its wrist cameras on a Raspberry Pi 4. A **state machine on the headset** runs the whole session, buttons on the grippers reach it over BLE, and every recorder uploads over **Wi-Fi** when an Episode ends.

EGO keeps that backbone and removes everything the hands used to hold:

| | UMI Data Collection | EGO Data Collection |
| --- | --- | --- |
| Hands | Handheld grippers | Bare hands, tracked by the Quest |
| Pose signal | Quest controllers mounted on the grippers | Palm Pose from hand tracking |
| Hand state | Gripper State from ArUco markers | Hand Skeleton, 21 keypoints per hand |
| Cameras | Two wrist cameras per gripper + head stereo camera | Stereo camera on the headset |
| Commands | Membrane keyboard → Pi → BLE | Two-handed Gesture Commands |
| Compute | Quest + one Raspberry Pi per gripper | The Quest alone |
| Recording logic | State machine on the Quest | **The same** state machine |

The headset is worn **around the neck** rather than over the eyes. The stereo camera then looks down at the hands and the table from chest height, the operator's face stays free, and the Quest can still track both hands.

<figure class="figure-media">
<a href="./images/projects/ego/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/ego/architecture.svg" alt="EGO system diagram: on the Meta Quest 3, a stereo UVC camera feeds the video recorder, hand tracking feeds the Hand Skeleton and Palm Pose export and a gesture recognizer, and the gesture recognizer drives the recording state machine, which starts and stops the recorders; episodes upload over Wi-Fi to a lab server" loading="lazy"></a>
<figcaption>Everything runs on the Quest: camera capture, hand tracking, gesture recognition and the recording state machine shared with UMI.</figcaption>
</figure>

## Preparation: checking every signal

Before recording hours of data, I checked that each stream was good enough to train on. A dataset is only as useful as its worst signal.

### 1. Hand tracking → a simulated dexterous hand

The Quest reports hands in the **OpenXR** hand-joint format, but most hand-retargeting and learning code expects the **MediaPipe** 21-keypoint layout. I convert each OpenXR hand into a MediaPipe **Hand Skeleton**, then retarget it onto a simulated **Wuji dexterous hand in MuJoCo**. If the simulated fingers follow mine smoothly through open hands, pinches and fists, the skeleton is reliable enough to record.

<figure class="figure-media">
<video data-src="./images/projects/ego/wuji-sim-teleop.mp4" muted loop playsinline preload="none" aria-label="Through the headset: the operator's hand moves while a simulated Wuji dexterous hand on the monitor copies the finger motion"></video>
<figcaption>My hand, seen through the headset, driving the Wuji hand in MuJoCo (on the monitor) from the converted Hand Skeleton. 2× speed.</figcaption>
</figure>

### 2. Palm Pose → a real robot arm

The fingers are only half the signal; the hand's **6-DoF pose** matters just as much. Hand tracking reports a wrist joint, but in testing the **palm center was noticeably steadier**, so EGO records the **Palm Pose**. To check it under real conditions, I teleoperated a robot arm with bare hands through my [VR teleoperation platform](#/projects/vr-teleoperation), with the arm following the Palm Pose.

<figure class="figure-media">
<video data-src="./images/projects/ego/palm-teleop.mp4" muted loop playsinline preload="none" aria-label="Bare-hand teleoperation: the operator's hand, with its tracked axes, moves and the robot arm follows"></video>
<figcaption>Bare-hand teleoperation: the robot arm follows the tracked Palm Pose (axes on the hand). 1.5× speed. Faces in the background are blurred.</figcaption>
</figure>

### 3. A stereo UVC camera inside the Quest

Rather than relying on the Quest's built-in cameras, EGO records its own: a **stereo UVC camera on the headset**, plugged in over USB-C and captured **by the Quest app itself**, with no extra computer. In the app I pick the camera, choose the left- and right-eye streams, set the target frame rate and start a live preview.

<figure class="figure-media">
<video data-src="./images/projects/ego/camera-setup.mp4" muted loop playsinline preload="none" aria-label="In the Quest app: configuring the stereo UVC camera and opening a live preview of its image"></video>
<figcaption>Connecting and configuring the stereo camera in the Quest app, ending with the live preview. 4× speed. Faces are blurred.</figcaption>
</figure>

## Data recording

### Gesture commands, same state machine

With no buttons to press, the operator controls recording with **two-handed gestures**. The recognizer classifies each hand's pose (Rock, Paper or Thumb), and a command fires only when **both hands hold the pose briefly**, so ordinary hand movements during a task don't trigger one by accident.

| Gesture | Command |
| --- | --- |
| Both fists, held ≈1 s | Start / stop recording |
| Both thumbs up | Label the Episode **success** |

The commands feed **the same state machine as UMI**, so both systems produce Episodes the same way:

```
Idle ──start──▶ Recording ──stop──▶ Review ──label──▶ Uploading ──▶ Idle
```

### The recording process

<figure class="figure-media">
<video data-src="./images/projects/ego/recording-demo.mp4" muted loop playsinline preload="none" aria-label="Recording an episode through the headset: setting the task, then folding a towel with both hands while gesture labels float in view"></video>
<figcaption>Recording an Episode through the headset. The floating words ("PaperRight", "RockPoseLeft", "ThumbPose…") are the gesture recognizer's live output. 1.5× speed. Faces are blurred.</figcaption>
</figure>

### What gets recorded

Every Episode contains:

- **Side-by-side stereo video** from the headset camera
- The **Hand Skeleton** of both hands in the MediaPipe 21-keypoint layout
- The **palm trajectory** of both hands (the Palm Pose over time)
- The Episode's **label**

Here is the stereo result of one Episode, a towel-folding task:

<figure class="figure-media">
<video class="wide-stereo" data-src="./images/projects/ego/stereo-view.mp4" muted loop playsinline preload="none" aria-label="Side-by-side left and right camera views of the operator folding a towel, seen from chest height"></video>
<figcaption>Side-by-side stereo from the headset camera: the left and right views of the same moment, giving depth for learning. Faces in the background are blurred.</figcaption>
</figure>

And the same kind of Episode seen from the outside. Watch for the two-handed **Gesture Commands** that start the recording, stop it and label it:

<figure class="figure-media">
<video data-src="./images/projects/ego/third-person.mp4" muted loop playsinline preload="none" aria-label="Third-person view of a data collector wearing the headset around the neck, folding a towel; captions mark the start, stop and label gestures"></video>
<figcaption>A data collector, wearing the headset around the neck, records a towel-folding Episode: both fists to <strong>start</strong>, both fists again to <strong>stop</strong>, both thumbs up to label it <strong>success</strong>. Face blurred for privacy.</figcaption>
</figure>

## Related

- [UMI Data Collection](#/projects/umi-data-collection): the handheld-gripper system EGO is built on
- [VR teleoperation](#/projects/vr-teleoperation): the platform used for the Palm Pose robot test
