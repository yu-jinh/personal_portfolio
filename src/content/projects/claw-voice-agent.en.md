---
title: An ESP32 AI Agent and Control Module for the Coglet Robot
summary: I reproduced the open-source Coglet robot and built my own AI agent and control module for it on an ESP32-S3, using Espressif's ESP-Claw framework, to test how well an LLM agent works on a tiny embedded board. The robot understands plain-language requests, triggers recorded motions, reports its own hardware, streams camera and audio, and sees people through an on-board AI vision module.
role: Reproduced the Coglet hardware from its open-source design, then built the agent and control layer on top: the ESP32 and I²C servo control wiring, porting ESP-Claw to the robot, the teach pendant with skill and task record/replay, the Lua bridge that lets the agent call motions, web camera and audio streaming, and the vision-module integration.
---

## At a glance

- **What:** A small desktop robot companion whose "brain" is an AI agent running on a microcontroller the size of a postage stamp
- **Why:** To find out how capable an LLM agent can be on cheap embedded hardware with a few hundred kilobytes of RAM, and what it takes to let it act in the physical world safely
- **Highlights:** XIAO ESP32-S3 + PCA9685 over two I²C wires · ESP-Claw agent framework · teach pendant to record and replay motions · plain-language control through terminal or web chat · live camera and audio in the browser · on-device person and face detection

## The building blocks, in plain words

| Building block | What it is | Its job here |
| --- | --- | --- |
| **Microcontroller (MCU)** | A tiny computer on one chip, with no operating system like a PC's, built to control hardware | The XIAO ESP32-S3 runs the agent, Wi-Fi, web pages and motor control |
| **Servo** | A small motor that turns to a commanded angle and holds it | Moves Coglet's ears, eyes, eyelids and head |
| **PWM servo driver** | A chip that generates the precise pulse signals servos need | The PCA9685 drives up to 16 servos so the MCU doesn't have to |
| **I²C** | A two-wire bus (data + clock) that lets one chip talk to several others | Connects the MCU to the servo driver and the vision module |
| **AI agent** | A program where a language model decides which actions to take, using a set of tools | Turns "take a nap" into the right motion |
| **Tool / script** | A function the agent is allowed to call | Lua scripts that read hardware info or play a motion |

## The robot: Coglet

[Coglet](https://www.kickstarter.com/projects/willcogley/coglet-open-source-3d-printable-robot-companion-kit) is an open-source, 3D-printable robot companion kit by Will Cogley. I reproduced the hardware from the open-source design: **9 servos** move its ears, eyes, eyelids and head. Everything described below is my own addition on top of that body: the AI agent, the ESP32 control module, the teach pendant, streaming and vision.

## Hardware and wiring

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/xiao-esp32s3-sense.jpg" alt="Seeed XIAO ESP32-S3 Sense: a thumb-sized board with a camera module and USB-C port" loading="lazy"><figcaption>XIAO ESP32-S3 Sense: dual-core MCU with Wi-Fi, extra PSRAM, camera and microphone. Product photo.</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/pca9685.jpg" alt="PCA9685 16-channel servo driver board with rows of three-pin servo headers and a screw terminal" loading="lazy"><figcaption>PCA9685: 16-channel, 12-bit PWM servo driver, controlled over I²C. Product photo.</figcaption></figure>
</div>

The **XIAO ESP32-S3 Sense** is the brain: a dual-core ESP32-S3 with Wi-Fi, extra PSRAM memory, plus a camera and microphone on its add-on board. The servos hang off a **PCA9685** driver. The MCU only sends "channel 4 → 30°" over I²C, and the PCA9685 generates the servo pulses itself, so the MCU's time is free for the agent.

<figure class="figure-media">
<a href="./images/projects/coglet/wiring.svg" target="_blank" rel="noreferrer"><img src="./images/projects/coglet/wiring.svg" alt="Wiring diagram: XIAO ESP32-S3 3V3, GND, GPIO5 and GPIO6 connect to the PCA9685's VCC, GND, SDA and SCL; the Grove Vision AI V2 shares SDA and SCL; a separate 5 V supply powers the servos through the PCA9685 screw terminal; 9 servos plug into channels 0-2, 4-6 and 8-10" loading="lazy"></a>
<figcaption>Two I²C wires (SDA on GPIO5, SCL on GPIO6) carry all control traffic. The servos get their own 5 V supply, sharing only ground with the board.</figcaption>
</figure>

- **I²C:** XIAO **GPIO5 → SDA**, **GPIO6 → SCL**, 3V3 and GND to the PCA9685's logic side (address 0x40). The vision module sits on the same two wires.
- **Servo power:** a separate **5 V supply** on the PCA9685's screw terminal. Nine servos moving together draw far more current than a USB-powered board can safely supply, and a sagging supply would reset the MCU.
- **Servos:** channels **0–2, 4–6 and 8–10**.

<figure class="figure-media figure-medium">
<img src="./images/projects/coglet/breadboard-wiring.jpg" alt="The real build: the XIAO on a breadboard wired to a PCA9685 board with many servo cables" loading="lazy">
<figcaption>The real thing: the XIAO on a breadboard (left) and the PCA9685 with the servo cables (right).</figcaption>
</figure>

## The agent: ESP-Claw

[ESP-Claw](https://github.com/espressif/esp-claw) is Espressif's open-source AI agent framework for its chips (Apache-2.0). It runs the agent loop, **sense → decide → act**, directly on the device, written in C. When something needs reasoning, it calls a cloud LLM over Wi-Fi with tool calling; everything else stays on the chip:

- **Tools and Lua scripts:** the actions the agent may take. New behaviour can be added as Lua scripts without reflashing firmware.
- **Memory:** an editable profile plus long-term memory, stored locally on the device.
- **Events:** device events can trigger the agent, and simple rules can run without calling the LLM at all.

My work was to make ESP-Claw *this* robot's brain: run it on the XIAO, give it tools for Coglet's body, and build the interfaces around it.

## Teach pendant: record motions, replay them by name

Asking an LLM to set nine servo angles in real time would be slow, unreliable and expensive. Instead, I built a **teach pendant**: a web page served by the robot itself, where motions are recorded by hand and saved under a name. The agent's job becomes simple: pick the right motion.

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-skill.png" alt="Teach pendant Skill tab: sliders for servo channels, plus a Skill Recorder and Skill Player" loading="lazy"><figcaption><strong>Skill</strong> tab: pose each servo, record keyframes, save and replay.</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-task.png" alt="Teach pendant Task tab: a skill pool, a task chain with up and down buttons, and a task player" loading="lazy"><figcaption><strong>Task</strong> tab: chain saved skills into a longer behaviour.</figcaption></figure>
</div>

1. **Pose:** move each servo channel with sliders or ±5° buttons until Coglet looks right.
2. **Record:** capture the pose as a keyframe; repeat to build up a motion.
3. **Save as a Skill:** keyframes, the time between frames in seconds, and whether to loop or play once, saved as a JSON file on the robot.
4. **Chain into a Task:** combine skills in order, such as *look up → turn right*, and save that too.

The agent reaches these motions through a **Lua script**: it calls the script with a skill or task name, and the script plays it on the servos. The LLM never handles raw angles; it chooses from a menu of named, tested motions.

<div class="figure-row">
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-sleepy.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet slowly drooping its eyelids and lowering its ears: the sleepy skill"></video><figcaption>The <strong>sleepy</strong> skill: eyelids droop and ears sag.</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-search.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet turning its head left and right with wide eyes: the searching task"></video><figcaption>The <strong>search</strong> behaviour: eyes wide, head scanning side to side.</figcaption></figure>
</div>

## Talking to the agent: terminal and web

The agent has two front doors: a **serial terminal** for development, and a **web chat** served by the robot for everyone else. Both reach the same agent and tools.

A terminal session, asking the robot about itself (translated from the original Chinese session; network details removed):

```text
basic_demo> ask_once "What device are you running on, and what can it do?"
claw_core: context_loaded  provider=Editable Profile Memory
claw_core: context_loaded  provider=Long-term Memory
claw_core: context_loaded  provider=Skills List
claw_core: context_loaded  provider=cap Tools
claw_core: context_loaded  provider=Time Context
claw_core: tool_call       name=get_system_info
claw_core: tool_result     name=get_system_info  err=ESP_OK
claw_core: completion      status=done

assistant> I'm running on an ESP32-S3.

  Device     chip ESP32-S3 · revision 2 · 2 CPU cores · up ~1259 s
  Memory     PSRAM ~6.49 MB (6.20 MB free) · internal RAM ~416 KB (194 KB free)
  Network    Wi-Fi connected · signal -51 dBm · WPA2/WPA3
  Can do     dual-core processing · Wi-Fi and local networking ·
             run Lua scripts · run tasks in the background
```

The log shows the agent loop at work: it loads its memory, the skill list and its tools into context, decides to call `get_system_info`, and answers from the **real readings**: chip revision, free memory, signal strength. None of it is guessed.

The same question works from the web chat:

<div class="chat-log">
<div class="chat-msg chat-user">Hi, tell me about this device's features and configuration.</div>
<div class="chat-msg chat-agent">Hi, the device is online. Here's an overview.<br><br><strong>Configuration:</strong> ESP32-S3 · rev 2 · dual-core · up ~36 s · 19 tasks running<br><strong>Memory:</strong> internal RAM 416,683 B total · 193,263 B free</div>
</div>

## Natural-language control

Here the pieces come together. I type an everyday sentence into the web chat. The agent works out what I mean, picks the matching motion, calls the Lua script, and confirms in words:

<figure class="figure-media">
<video data-src="./images/projects/coglet/chat-control.mp4" muted loop playsinline preload="none" aria-label="Typing messages into the ESP-Claw web chat while Coglet acts them out: it gets sleepy when told to nap, then wakes and searches when asked to help find something"></video>
<figcaption>"You're off work now, take a little nap" → Coglet gets sleepy. "Stop napping, get up and help me find something" → it wakes and starts searching. English subtitles added; the original chat was in Chinese. 1.25× speed.</figcaption>
</figure>

Neither sentence names a motion. The agent maps "nap" to the *sleepy* skill and "help me find something" to *search* by itself, which is exactly the gap between how people talk and the robot's fixed motion list that an LLM is good at bridging.

## Giving it eyes

### Live camera and audio in the browser

The XIAO's own camera and microphone stream straight to a web page served by the robot: **MJPEG video at 640×480, 30 fps**, plus **16 kHz PCM audio** from the on-board microphone, with a live level meter. Anyone on the network can see and hear what Coglet does, with no app to install.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/coglet/camera-stream.mp4" muted loop playsinline preload="none" style="aspect-ratio: 900 / 1080" aria-label="Browser page showing Coglet's live camera view of the room as the head turns, with an audio streaming panel below"></video>
<figcaption>Coglet's live camera view in the browser while its head moves, with the audio stream panel below. Faces are blurred.</figcaption>
</figure>

### On-device vision: Grove Vision AI V2

Streaming video to a person is useful; *understanding* it on the robot is better. A **Grove Vision AI V2** module adds a Himax WiseEye2 chip with an Arm **Ethos-U55 neural processor**. It runs detection models **locally, in about 21 ms per frame**, and sends only the results (boxes, labels, confidence) over the same I²C bus. No video ever needs to leave the robot.

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/grove-vision-ai-v2.jpg" alt="Grove Vision AI V2 board with a camera connector and USB-C port" loading="lazy"><figcaption>Grove Vision AI V2. Product photo.</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/vision-face-detection.mp4" muted loop playsinline preload="none" style="aspect-ratio: 940 / 690" aria-label="Face detection running on the vision module: a red box labelled face with a confidence score follows a face, while the device log prints the detected boxes"></video><figcaption>Face detection on the module: the box and confidence (left) and the raw results it sends (right).</figcaption></figure>
</div>

The detections are exposed to the agent as a **tool**, so it can answer questions like *"is anyone in front of you?"* or react when a person appears. That's high-level information about the world, ready for downstream behaviour, at a cost of a few bytes on a shared bus.

## What I learned

- **A microcontroller can host a useful agent.** With PSRAM, the ESP32-S3 holds the agent loop, memory, web server, camera stream and motor control at once. The heavy reasoning goes to a cloud LLM, and everything else stays local.
- **Give the LLM menus, not motors.** Named, recorded skills make behaviour reliable and safe. The model is great at choosing the right action and poor at producing smooth servo trajectories.
- **Push perception to the edge.** A dedicated vision chip that sends results instead of video keeps the MCU free and the data private.

## Related

- [VR Teleoperation Platform](#/projects/vr-teleoperation): controlling bigger robots in real time
- Earlier, I also ran a lighter version of the agent, zero-Claw, on a Raspberry Pi.
