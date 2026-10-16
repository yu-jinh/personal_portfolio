---
title: UMI Data Collection Device
summary: A pair of handheld grippers for recording two-handed manipulation demonstrations without a robot, with Quest controllers tracking each gripper and an on-board Raspberry Pi 4 recording its wrist cameras.
role: I built it end to end, mostly on my own: mechanical design (fingers adapted from the UFactory xArm Gripper), electronics, the Raspberry Pi recorder, the Quest recording app and its state machine, and post-processing.
brief: Two handheld grippers record two-handed manipulation without a robot, tracked by Quest controllers and coordinated by one state machine on the headset.
facts: 2 × 2 :: grippers × wrist cameras on each || 640 × 480 :: resolution of each wrist camera || 3 :: recorders driven by one state machine
---

## Summary

Two handheld grippers and a Meta Quest 3 record two-handed manipulation demonstrations with no robot involved. A lab server turns each labelled episode into a training dataset of synchronized images, gripper poses and gripper openings.

Each recording needs gripper pose accurate enough to replay on a robot arm, video from the gripper's viewpoint, and the gripper opening. Two-handed tasks double this and add a first-person view from the operator's head. Every stream must be synchronized, labelled and offloaded without manual copying.

A Quest controller rigidly mounted on each gripper tracks its pose live. A Raspberry Pi 4 on each gripper records two 640 × 480 wrist cameras through its hardware H.264 encoder. ArUco markers on the fingers, seen by the wrist camera, give the gripper opening.

One state machine on the headset drives all three recorders: the Quest 3 and both grippers. Each button press becomes one event and one Quest decision, so the two grippers can never disagree about recording. After labelling, each recorder uploads its share of the episode to a lab server over Wi-Fi.

Collecting data with a real robot is slow and expensive. Following the Universal Manipulation Interface (UMI) idea, the handheld tool matches the robot's gripper. Demonstrations recorded anywhere transfer to a robot fitted with the same gripper.

## Design advantages

| Requirement | How this device meets it |
| --- | --- |
| Gripper opening | ArUco markers on the fingers, read from the wrist camera, so the moving fingers need no sensors or wiring |
| Two cameras per gripper | The Raspberry Pi 4 hardware H.264 encoder does the compression, which makes two streams practical |
| Controller-to-gripper transform | Taken from the CAD model, with no calibration step |
| Start, stop and labelling | Membrane keyboard on the handle |
| Moving data off the device | Wi-Fi upload after every episode |
| Power | 3S battery |

Each gripper is a self-contained wireless recorder, and the two are identical, one per hand. The electronics are off-the-shelf (Quest 3, Raspberry Pi 4s, UVC cameras), and the custom parts are 3D-printed. This keeps the rig inexpensive and easy to rebuild.

## System architecture

<figure class="figure-media">
<a href="./images/projects/umi/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/umi/architecture.svg" alt="System diagram: the Meta Quest 3 runs the recording state machine and talks to the left and right UMI devices over BLE; each device has a Raspberry Pi 4, two UVC wrist cameras, a membrane keyboard and a 3S battery; all three upload over Wi-Fi to a lab server, followed by post-processing into a training dataset" loading="lazy"></a>
<figcaption>Three recorders (the headset and two grippers) run under one state machine on the Quest. The BLE link carries button presses to the headset and start/stop commands back to both grippers. After every episode, all three upload over Wi-Fi to a lab server, where post-processing builds a training dataset.</figcaption>
</figure>

Every pose and video frame is timestamped at capture, and post-processing matches the streams by nearest timestamp.

| Recorder | What it records |
| --- | --- |
| Meta Quest 3 | Head pose, both controller poses (the gripper poses), head stereo camera |
| UMI Device, left | Two wrist cameras (which also capture the left Gripper State) |
| UMI Device, right | Two wrist cameras (which also capture the right Gripper State) |

<details>
<summary>State machine and clock sync</summary>

```
Idle ──start──▶ Recording ──stop──▶ Review ──label──▶ Uploading ──▶ Idle
                                       │
                         success / fail / discard
```

1. The operator presses a button on the gripper's membrane keyboard. The keyboard is wired to the Raspberry Pi, which forwards the press to the Quest over **BLE**.
2. The Quest decides the next state and sends **start** or **stop** back to **both** Pis over the same BLE link.
3. After stopping, the operator labels the episode as success, fail or discard.
4. Each recorder uploads its share of the episode to a lab server over **Wi-Fi**. Until then, the Pis keep the video on their microSD cards.

The streams come from three separate clocks. The Pis keep their clocks synchronized over the network (NTP).

</details>

<details>
<summary>Post-processing steps</summary>

- Align the headset poses, both controller poses and all camera frames by timestamp.
- Detect the ArUco markers in each wrist-camera frame and convert the distance between them into a gripper opening (the Gripper State).
- Apply the CAD transform from each controller to its gripper's fingertips to get the gripper pose.

These synchronized images, gripper poses and Gripper States are the observations and actions a robot policy learns from.

</details>

## Rig in use

The video at the top shows the full rig in use. The operator (left) holds a gripper and wears the Quest 3, with a stereo camera mounted on top. The live views (right) come from the USB wrist cameras, which look along the fingers. They show the gripper's fingers and orange fingertips as a robot's wrist camera would.

<figure class="figure-media">
<img src="./images/projects/umi/cad-onshape.jpg" alt="Onshape CAD assembly of the UMI device: gripper fingers, handle, controller mount on top, camera mounts and electronics housing" loading="lazy">
<figcaption>The CAD model in Onshape. The fingers and linkage are adapted from the UFactory xArm Gripper; I designed the handle, controller mount, camera mounts and electronics/battery housing.</figcaption>
</figure>

## Comparison with original UMI

| Aspect | Original UMI (Chi et al., RSS 2024) | This device |
| --- | --- | --- |
| Pose source | Visual SLAM on GoPro footage from the gripper | Inside-out tracking of a Quest controller on the gripper |
| When pose is available | Recovered after recording | Live, with no mapping step |

Both designs record from a camera on the handheld gripper and differ in how they obtain its pose. Quest tracking also puts both gripper poses in the headset's frame.

## Related

- [EGO data collection](#/projects/ego-data-collection): the same recording system without the handheld grippers, using Quest hand tracking and the head stereo camera
- [VR teleoperation](#/projects/vr-teleoperation): collecting demonstrations by driving the real robot
- [Universal Manipulation Interface](https://umi-gripper.github.io/) (Chi et al., RSS 2024): the original UMI project

<!-- TODO: add frame rate, battery runtime, device weight and the number of episodes / hours collected if you can share them. -->
