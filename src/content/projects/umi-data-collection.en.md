---
title: UMI Data Collection Device
summary: A pair of self-built handheld grippers for recording two-handed robot manipulation demonstrations without a robot. Meta Quest controllers track each gripper, and an on-board Raspberry Pi 4 records its wrist cameras.
role: Built it end to end, mostly on my own: mechanical design (fingers adapted from the UFactory xArm Gripper), electronics, the Raspberry Pi recorder, the Quest recording app with its state machine, and post-processing.
---

## At a glance

- **What:** Two handheld grippers (left and right) plus a Meta Quest 3, recording two-handed manipulation demonstrations
- **Why:** Collecting data with a real robot is slow and expensive. Handheld grippers let a person record demonstrations anywhere, and the data transfers to a robot with the same gripper.
- **Highlights:** Quest controller pose tracking · two wrist cameras per gripper with hardware H.264 encoding · gripper opening read from ArUco markers · BLE buttons driving a state machine on the headset · Wi-Fi upload after every episode

## The problem

The idea behind the **Universal Manipulation Interface (UMI)** is simple: give a person a handheld tool that matches the robot's gripper, record what they do, and train the robot on those recordings. The hard part is engineering. Each recording needs:

- the **pose** of every gripper, accurate enough to replay on a robot arm
- **video from the gripper's point of view**, the same view the robot's wrist camera will see
- **how far the gripper is open** at every moment
- all of it **synchronized**, labelled, and moved off the device without anyone copying files by hand

For two-handed tasks, that doubles: two grippers, plus a first-person view from the operator's head.

## The demo

The video at the top shows the full rig in use. On the left, the operator wears the Quest 3 with a stereo camera on top and holds a gripper; on the right are the live wrist-camera views. Each gripper's view shows its fingers and orange fingertips, the same view a robot's wrist camera would have.

## Hardware

<figure class="figure-media">
<img src="./images/projects/umi/cad-onshape.jpg" alt="Onshape CAD assembly of the UMI device: gripper fingers, handle, controller mount on top, camera mounts and electronics housing" loading="lazy">
<figcaption>The CAD model in Onshape. The fingers and linkage are adapted from the UFactory xArm Gripper; the handle, controller mount, camera mounts and electronics/battery housing are my own design.</figcaption>
</figure>

Each gripper is a self-contained, wireless recorder:

- **Compute: Raspberry Pi 4.** It records both cameras on the Pi's **hardware H.264 encoder**, so two video streams don't saturate the CPU.
- **Cameras: two UVC cameras over USB**, at 640×480, mounted at the wrist and looking along the fingers into the workspace.
- **Gripper State from vision.** There's no sensor or wiring in the fingers. **ArUco markers** on the fingers are visible to the wrist camera, and the opening is measured from the markers in post-processing.
- **Pose: a Meta Quest controller** mounted rigidly on top. The transform from the controller to the gripper comes straight from the CAD model, so no calibration step is needed.
- **Controls: a membrane keyboard** on the handle for start, stop and labelling, so the operator never puts the gripper down.
- **Power: a 3S battery.** The device has no cables to a PC or a wall socket.

The two grippers are identical, one for each hand.

## System architecture

<figure class="figure-media">
<a href="./images/projects/umi/architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/umi/architecture.svg" alt="System diagram: Meta Quest 3 runs the recording state machine and talks to the left and right UMI devices over BLE; each device has a Raspberry Pi 4 with two UVC wrist cameras, a membrane keyboard and a 3S battery; all three upload over Wi-Fi to a lab server, followed by post-processing and a training dataset" loading="lazy"></a>
<figcaption>Three recorders (the headset and two grippers) under one state machine on the Quest, with Wi-Fi upload to a lab server after every episode.</figcaption>
</figure>

Every episode is recorded by **three devices at once**:

| Recorder | What it records |
| --- | --- |
| Meta Quest 3 | Head pose, both controller poses (the grippers' poses), head stereo camera |
| UMI Device, left | Two wrist cameras (which also capture the left Gripper State) |
| UMI Device, right | Two wrist cameras (which also capture the right Gripper State) |

### One state machine, on the headset

The whole collection process is run by a **state machine in the Quest app**:

```
Idle ──start──▶ Recording ──stop──▶ Review ──label──▶ Uploading ──▶ Idle
                                       │
                         success / fail / discard
```

1. The operator presses a button on the gripper's **membrane keyboard**. The keyboard is wired to the Raspberry Pi, which forwards the press to the Quest over **BLE**.
2. The **Quest decides** the next state and sends **start** or **stop** back to **both** Pis over the same BLE link.
3. After stopping, the operator **labels** the episode as success, fail or discard.
4. Each recorder **uploads** its part of the episode over **Wi-Fi** to a lab server. Until then, the Pis keep the video on their microSD cards.

Putting the state machine on the headset gives the system a **single source of truth**. Each button press is one event, the Quest makes one decision, and all three recorders follow it. The two grippers can never disagree about whether they are recording.

### Keeping the streams in sync

The streams come from three separate clocks. The Pis keep their clocks synchronized over the network (NTP), every pose and video frame is **timestamped** when it's captured, and post-processing matches the streams by nearest timestamp.

## Post-processing

On the lab server, each labelled episode becomes training data:

- **Align** the headset poses, both controllers' poses and all camera frames by timestamp
- **Gripper State:** detect the ArUco markers in each wrist-camera frame and turn their distance into a gripper opening
- **Gripper pose:** apply the CAD transform from each controller to its gripper's fingertips

The result is a dataset of synchronized images, gripper poses and Gripper States, the observations and actions a robot policy learns from.

## Design decisions

- **Pose from Quest controllers instead of visual SLAM.** The original UMI (Chi et al., RSS 2024) records with a GoPro on the gripper and recovers the pose from the footage afterwards. Inside-out tracking on the Quest gives every gripper's pose live, in the same frame as the headset, with no mapping step.
- **Gripper State from markers, not a sensor.** Reading the opening from ArUco markers the camera already sees means no extra electronics or wiring in the moving fingers.
- **Hardware encoding on the Pi.** Two cameras per gripper are only practical on a Raspberry Pi 4 because its video encoder does the compression.
- **Off-the-shelf parts.** A Quest 3, Raspberry Pi 4s, UVC cameras and 3D-printed parts make the rig cheap and easy to rebuild.

## Related

- [EGO data collection](#/projects/ego-data-collection): the same recording system without the handheld grippers, using Quest hand tracking and the head stereo camera
- [VR teleoperation](#/projects/vr-teleoperation): collecting demonstrations by driving the real robot
- [Universal Manipulation Interface](https://umi-gripper.github.io/) (Chi et al., RSS 2024): the original UMI project

<!-- TODO: add frame rate, battery runtime, device weight and the number of episodes / hours collected if you can share them. -->
