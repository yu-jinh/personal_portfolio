---
title: VR Teleoperation Platform for Robots
summary: A Meta Quest app and real-time infrastructure for driving robots remotely. Operators, robots and observers meet in a LiveKit room; one robot-independent interface drives xArm arms and a humanoid with dexterous hands, and one click switches between robots.
role: Founding engineer. Designed and built the platform end to end: the Quest app (Unity + OpenXR), the LiveKit room architecture, the robot-independent teleop interface and robot bridges, controller calibration, and the data-collection workflow.
---

## At a glance

- **What:** Real-time robot teleoperation from a Meta Quest headset, with live video, audio and data in both directions
- **Why:** Teleoperation is the most direct way to collect high-quality demonstrations for robot learning, and to control robots that are far away
- **Highlights:** Unity + OpenXR app on Meta Quest 3 · LiveKit rooms where operators, robots and observers are all participants · one interface for different robots · control at 200 Hz, video at 30 fps · up to 3 robots in one room, switched with one click

## The building blocks, in plain words

The platform combines a few technologies that are easier to follow once you know what each one does:

| Building block | What it is | Its job here |
| --- | --- | --- |
| **Meta Quest 3** | A standalone headset that tracks your head, both hands and two controllers in 3D, and can show the real room through its cameras (mixed reality) | The operator's input device and display |
| **OpenXR** | An open standard for talking to XR headsets, like a common language between apps and devices | Reads head, hand and controller tracking without locking the app to one vendor's SDK |
| **Unity** | A real-time 3D engine, widely used for games and XR | Builds the app: floating panels, video screens and input handling |
| **LiveKit** | An open-source real-time communication platform built on **WebRTC**, the technology behind browser video calls | Carries video, audio and control data between everyone in a session |
| **Room / participant** | LiveKit's model: a *room* is like a video-call meeting; everyone in it is a *participant* who can publish streams and subscribe to others' | Operators, robots and observers all join the same room |
| **Reliable vs. lossy data** | Reliable messages always arrive, sometimes late. Lossy ones arrive fast, or not at all | Teleop commands go lossy, because only the newest pose matters. Acknowledgements and text go reliably |

Two numbers describe how responsive it is: the operator's commands go out **200 times per second (200 Hz)**, and the robot's cameras stream at **30 frames per second**.

## Room architecture

<figure class="figure-media">
<a href="./images/projects/vr-teleop/room-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/room-architecture.svg" alt="Room diagram: a token service gives access to authenticated users; a self-hosted LiveKit server hosts the room; inside, the teleoperator sends teleop messages at 200 Hz to the selected robot A and receives camera video, audio and ACKs; robots B and C wait; observers such as the data collection dashboard receive live video; a cloud voice agent talks to the operator" loading="lazy"></a>
<figcaption>Who is in a room and what flows between them. This is a logical view: physically, every stream passes through the LiveKit server.</figcaption>
</figure>

Every session happens in a **room** on a self-hosted **LiveKit server**. A small **token service** hands out access, so **only authenticated users can join**. Once inside, everyone is a **participant**:

- **Teleoperator:** the Quest app. It publishes **teleop messages** at 200 Hz, plus the headset camera and microphone, and subscribes to the robots' video, audio and acknowledgements.
- **Robots:** each robot joins through its own **robot bridge**. The bridge turns teleop messages into commands for that robot, and publishes its cameras, microphone and **ACKs** (confirmations that commands arrived).
- **Observers:** view-only participants. The main one is the team's **Data Collection Dashboard**, a web page that shows the room's live camera streams. It also opens inside the headset. Other headsets can join to watch.
- **Cloud voice agent:** a participant that can talk to the operator, sending text-to-speech text and audio.

Because robots are just participants, **several robots can share a room**. The operator picks one from a list, and the app addresses its teleop messages only to that robot; the others receive nothing and hold their pose. I've tested up to **3 robots in one room**, and the design isn't limited to that.

<figure class="figure-media figure-medium">
<img src="./images/projects/vr-teleop/dashboard.jpg" alt="The Data Collection Dashboard web page shown in a headset panel: room configuration with a room name and a Join Room button, and publisher selection" loading="lazy">
<figcaption>The Data Collection Dashboard, opened inside the headset: join a room, then choose which participant's video to watch.</figcaption>
</figure>

## Inside the headset app

<figure class="figure-media">
<a href="./images/projects/vr-teleop/client-architecture.svg" target="_blank" rel="noreferrer"><img src="./images/projects/vr-teleop/client-architecture.svg" alt="Client architecture in three layers: a connection layer with LiveKitRoomManager; a data ingestion layer with LiveKitPublisher and LiveKitSubscriber; and a UI layer with DataSource, VideoSource and AudioSource feeding the publisher, and DataSink, VideoSink and AudioSink fed by the subscriber" loading="lazy"></a>
<figcaption>The Quest app in three layers: connecting to the room, moving streams in and out, and showing them to the operator.</figcaption>
</figure>

The app is split into three layers, so each part can change without breaking the others:

1. **Connection layer:** `LiveKitRoomManager` joins the room and keeps track of who else is in it.
2. **Data ingestion layer:** `LiveKitPublisher` sends the headset's own streams, and `LiveKitSubscriber` receives everyone else's.
3. **UI / display layer:** *sources* produce what the operator sends (teleop messages, headset camera, microphone). *Sinks* turn what arrives into things the operator sees and hears: floating video panels for robot cameras, robot audio, the voice agent, and status text from ACKs.

<figure class="figure-media">
<img src="./images/projects/vr-teleop/headset-streams.jpg" alt="Inside the headset: a web view panel with a live wrist-camera stream, a camera panel showing an Arducam USB camera feed, and a settings panel with exposure, ISO, brightness, contrast, saturation and white-balance sliders" loading="lazy">
<figcaption>Inside the headset: a live stream from the room (left), and a USB camera plugged into the Quest (middle) with its exposure, ISO and white balance tuned from the headset (right).</figcaption>
</figure>

The headset can also stream from **USB (UVC) cameras plugged into the Quest**, with exposure, ISO, brightness and white balance adjustable from inside VR. My [EGO Data Collection](#/projects/ego-data-collection) setup is built on the same capability. **Mixed-reality passthrough** keeps the real room visible around the panels, so the operator never loses track of where they're standing.

## One interface, many robots

The app never talks to a specific robot directly. It sends one **robot-independent teleop message**: target poses for each hand or controller, the gripper or finger state, and button flags. Each robot's **bridge** translates that message for its own hardware:

- **xArm 7 arms:** bridge → xArm controller, one arm per hand, singly or as a two-arm table
- **Humanoid with Wuji dexterous hands:** bridge → arm and hand controllers, with the fingers driven by hand tracking

Adding a new robot means writing a new bridge, not changing the app.

**Controller calibration.** People hold the controller differently, and on some setups it's mounted in its own way. So the same physical motion can come out with rotated axes. A **calibration matrix** maps the controller's actual holding pose onto the conventional axes the bridges expect, and is set once per setup. Hand teleoperation later reuses the same alignment for the [Palm Pose](#/projects/ego-data-collection).

## Demos

### Switching between robots in one room

<figure class="figure-media figure-medium">
<video data-src="./images/projects/vr-teleop/fleet-switching.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: the operator drives one pair of xArm 7 arms, clicks another robot in the overhead panels, then drives the second robot"></video>
<figcaption>Two xArm 7 robots in the same room. The operator drives one, switches with a click in the overhead panels, and drives the other. The white rectangles are live video panels that the headset's screen recorder doesn't capture. 1.5× speed.</figcaption>
</figure>

### Controller calibration and live streaming on an xArm

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/xarm-calibration.mp4" muted loop playsinline preload="none" aria-label="Through the headset: the LiveKit connection panel with calibration settings, controller axes, a live robot camera thumbnail, and an xArm following the controller"></video>
<figcaption>The pre-test for hand teleoperation: the calibrated controller axes, the room panel, a live robot-camera stream (top right), and the xArm following the controller. 1.5× speed.</figcaption>
</figure>

### Hand teleoperation and data collection on a humanoid

The same platform drives a humanoid with **Wuji dexterous hands**, provided by [Theta Intelligence](https://www.theta-intelligence.com/), using bare-hand tracking instead of controllers. The full data-collection workflow runs from the headset:

- **Foot pedals**, paired with the Quest over BLE, engage each arm and start or stop recording, so the hands stay free.
- The **robot side records** each episode: its cameras, joint states and the commands it received.
- After stopping, the operator picks up the controllers to **label** the episode (save or discard) and **reset** the arms for the next one.

<figure class="figure-media">
<video data-src="./images/projects/vr-teleop/humanoid-hand-teleop.mp4" muted loop playsinline preload="none" aria-label="Step-by-step data collection on a humanoid robot: connecting to the room, switching to hand tracking, two-arm hand teleoperation with foot pedals, recording, labelling and resetting"></video>
<figcaption>The full workflow, step by step: connect, switch to hand tracking, align and engage with the pedals, record, label and reset. Sped up (2–3×), with the repeated second episode cut. Faces are blurred.</figcaption>
</figure>

## What I'd highlight

- **End-to-end ownership:** the Quest app, the room architecture, the robot bridges and the data-collection workflow were all built by me.
- **Designed to scale out:** robots, operators and observers are all just participants, so adding a robot or a viewer needs no new infrastructure.
- **Built for data:** the same platform feeds robot-learning datasets, alongside my [UMI](#/projects/umi-data-collection) and [EGO](#/projects/ego-data-collection) collection work.

## Related

- [EGO Data Collection](#/projects/ego-data-collection): hand tracking and Palm Pose, validated on this platform
- [UMI Data Collection](#/projects/umi-data-collection): handheld-gripper data collection driven by the same kind of headset state machine
