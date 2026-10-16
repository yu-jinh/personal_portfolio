---
title: VR Teleoperation Platform for Robots
summary: A Meta Quest app and real-time LiveKit infrastructure for remote robot teleoperation. One robot-independent interface drives both xArm arms and a humanoid with dexterous hands.
role: Founding engineer. Designed and built the platform end to end: the Quest app (Unity + OpenXR), the LiveKit room architecture, the robot-independent teleop interface and robot bridges, controller calibration, and the data-collection workflow.
brief: One Quest app teleoperates different robots by sending a single robot-independent teleop message through LiveKit rooms, while others watch live.
facts: 200 Hz :: teleop command publish rate || 30 fps :: robot camera video stream || 3 robots :: tested in one room, switched with one click
---

## Summary

One Meta Quest app teleoperates both xArm 7 arms and a humanoid with Wuji dexterous hands. The robots share a LiveKit room, and the operator switches between them with one click. 3 robots have been tested in one room, and nothing in the design caps it at three.

Teleoperation supplies demonstrations for robot learning and lets people control robots that are far away. It needs control, video and audio to flow both ways in real time. Each robot also expects commands for its own joints.

Operators, robots and observers all join one LiveKit room as participants. The headset publishes one robot-independent teleop message at 200 Hz over a lossy channel. Each robot's bridge translates it for its hardware and streams camera video back at 30 fps.

The demo videos show one operator switching between two xArm 7 robots in the same room with a click. On the humanoid, bare-hand tracking and foot pedals run the full record, label and reset workflow.

Recording, labelling and resetting happen in the same headset session. The platform therefore also produces robot-learning data, alongside my [UMI](#/projects/umi-data-collection) and [EGO](#/projects/ego-data-collection) rigs.

<details>
<summary>Building blocks in plain words</summary>

| Building block | What it is | Its job here |
| --- | --- | --- |
| **Meta Quest 3** | A standalone headset that tracks your head, both hands and two controllers in 3D. Its cameras can show the real room (mixed reality) | The operator's input device and display |
| **OpenXR** | An open standard for communicating with XR headsets: a common language between apps and devices | Reads head, hand and controller tracking without tying the app to one vendor's SDK |
| **Unity** | A real-time 3D engine, widely used for games and XR | Builds the app: floating panels, video screens and input handling |
| **LiveKit** | An open-source real-time communication platform built on **WebRTC**, the technology behind browser video calls | Carries video, audio and control data between everyone in a session |
| **Room / participant** | LiveKit's model: a *room* is like a video call. Everyone in it is a *participant* who can publish streams and subscribe to others' streams | Operators, robots and observers all join the same room |
| **Reliable vs. lossy data** | Reliable messages always arrive, sometimes late. Lossy messages arrive quickly or not at all | Teleop commands go lossy (see Design choices). Acknowledgements and text go reliably |

</details>

## Design choices

| Design choice | Why | Shown in this project |
| --- | --- | --- |
| Everyone is a room participant | Adding a robot or a viewer only requires joining the room, with no new infrastructure | 3 robots tested in one room. The dashboard and other headsets watch live |
| One robot-independent teleop message | Each robot's bridge maps the same command onto its own joints | The same app drives xArm 7 arms and the humanoid. Switching robots takes one click |
| Lossy channel for control | Only the newest pose matters, so a late command is dropped instead of queued behind newer ones | Teleop commands go out at 200 Hz |

## Room architecture

<figure class="figure-media">
<a href="./images/projects/vr-teleop/room-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/room-architecture.svg" alt="Room diagram: a token service grants access to authenticated users; a self-hosted LiveKit server hosts the room; inside it, the teleoperator sends teleop messages at 200 Hz to the selected robot A and receives camera video, audio and ACKs; robots B and C wait; observers such as the data collection dashboard receive live video; a cloud voice agent talks to the operator" loading="lazy"></a>
<figcaption>All participants meet in one room, and teleop messages reach only the selected robot. This is a logical view: physically, every stream passes through the LiveKit server.</figcaption>
</figure>

Every session runs in a room on a self-hosted LiveKit server. A small token service grants access, so only authenticated users can join. The operator picks one robot from a list, and the app sends teleop messages only to that robot. The others receive nothing and hold their pose.

<details>
<summary>Participants and their streams</summary>

| Participant | What it does |
| --- | --- |
| Teleoperator | The Quest app. Publishes teleop messages at 200 Hz, the headset camera and microphone. Subscribes to robot video, audio and ACKs. |
| Robot | Joins through its own robot bridge, which turns teleop messages into commands for that robot. Publishes cameras, microphone and ACKs (confirmations that commands arrived). |
| Observer | View-only. The main one is the team's Data Collection Dashboard, a web page of the room's live camera streams that also opens in the headset. Other headsets can join to watch. |
| Cloud voice agent | Talks to the operator with text for text-to-speech, and audio. |

<figure class="figure-media figure-medium">
<img src="./images/projects/vr-teleop/dashboard.jpg" alt="The Data Collection Dashboard web page shown in a headset panel: room configuration with a room name field and a Join Room button, and publisher selection" loading="lazy">
<figcaption>The Data Collection Dashboard, opened inside the headset: join a room, then choose which participant's video to watch.</figcaption>
</figure>

</details>

<details>
<summary>Inside the headset app</summary>

<figure class="figure-media">
<a href="./images/projects/vr-teleop/client-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/client-architecture.svg" alt="Client architecture in three layers: a connection layer with LiveKitRoomManager; a data ingestion layer with LiveKitPublisher and LiveKitSubscriber; and a UI layer in which DataSource, VideoSource and AudioSource feed the publisher, and the subscriber feeds DataSink, VideoSink and AudioSink" loading="lazy"></a>
<figcaption>The Quest app in three layers: connecting to the room, sending and receiving streams, and presenting them to the operator.</figcaption>
</figure>

The app has three layers, so each can change without breaking the others. `LiveKitRoomManager` joins the room and tracks who else is in it. `LiveKitPublisher` sends the headset's own streams, and `LiveKitSubscriber` receives everyone else's. *Sources* produce what the operator sends, and *sinks* turn incoming streams into video panels, robot audio, the voice agent and ACK status text.

<figure class="figure-media">
<img src="./images/projects/vr-teleop/headset-streams.jpg" alt="Inside the headset: a web view panel with a live wrist-camera stream, a camera panel showing an Arducam USB camera feed, and a settings panel with sliders for exposure, ISO, brightness, contrast, saturation and white balance" loading="lazy">
<figcaption>Inside the headset: a live stream from the room (left) and a USB camera plugged into the Quest (middle). Its exposure, ISO and white balance are adjusted from the headset (right).</figcaption>
</figure>

The headset also streams from USB (UVC) cameras plugged into the Quest, with exposure, ISO, brightness and white balance adjustable in VR. My [EGO Data Collection](#/projects/ego-data-collection) setup builds on this. Mixed-reality passthrough keeps the real room visible around the panels, so the operator knows where they stand.

</details>

## One message, many robots

The app never addresses a specific robot. It sends one robot-independent teleop message: a target pose for each hand or controller, the gripper or finger state, and button flags. Each robot's bridge translates that message for its own hardware.

On xArm 7 arms, the bridge drives the xArm controller with one arm per hand, used singly or as a two-arm table. On the humanoid with Wuji dexterous hands, it drives the arm and hand controllers, and hand tracking drives the fingers. A new robot needs only a new bridge, and the app stays unchanged.

Controller calibration aligns the axes once per setup. People hold the controller differently and some setups mount it their own way, which can rotate the axes. A calibration matrix maps the actual holding pose onto the conventional axes the bridges expect. Hand teleoperation later reused this alignment for the [Palm Pose](#/projects/ego-data-collection).

## Demo videos

### Switching robots in one room

<figure class="figure-media figure-medium">
<video data-src="./images/projects/vr-teleop/fleet-switching.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: the operator drives one pair of xArm 7 arms, selects another robot in the overhead panels, then drives the second robot"></video>
<figcaption>One operator drives two xArm 7 robots in the same room and switches between them with one click. The operator drives one robot, selects the other in the overhead panels, then drives it. The white rectangles are live video panels, which the headset's screen recorder doesn't capture. 1.5× speed.</figcaption>
</figure>

### Calibration and streaming on xArm

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/xarm-calibration.mp4" muted loop playsinline preload="none" aria-label="Through the headset: the LiveKit connection panel with calibration settings, the controller axes, a live robot camera thumbnail, and an xArm following the controller"></video>
<figcaption>The xArm follows the calibrated controller while its camera streams live into the headset. This pre-test for hand teleoperation shows the calibrated controller axes, the room panel and the robot-camera stream (top right). 1.5× speed.</figcaption>
</figure>

### Humanoid hand teleop and recording

The same platform drives a humanoid with Wuji dexterous hands, provided by [Theta Intelligence](https://www.theta-intelligence.com/), through bare-hand tracking. Foot pedals paired with the Quest over BLE engage each arm and start or stop recording, keeping the operator's hands free. The robot side records its cameras, joint states and received commands for each episode. The operator then labels the episode (save or discard) with the controllers and resets the arms.

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/humanoid-hand-teleop.mp4" muted loop playsinline preload="none" aria-label="Step-by-step data collection on a humanoid robot: connecting to the room, switching to hand tracking, two-arm hand teleoperation with foot pedals, recording, labelling and resetting"></video>
<figcaption>The whole data-collection workflow runs from the headset. Step by step: connect, switch to hand tracking, align and engage with the pedals, record, label and reset. Sped up 2–3×, with the repeated second episode cut. Faces are blurred.</figcaption>
</figure>

## Related

- [EGO Data Collection](#/projects/ego-data-collection): hand tracking and Palm Pose, validated on this platform
- [UMI Data Collection](#/projects/umi-data-collection): handheld-gripper data collection driven by the same kind of headset state machine
