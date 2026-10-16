---
title: An ESP32 AI Agent and Control Module for the Coglet Robot
summary: I reproduced the open-source Coglet companion robot designed by Will Cogley and built an AI agent and control module for it on an ESP32-S3 with Espressif's ESP-Claw framework.
role: Reproduced the Coglet hardware from its open-source design, then built the agent and control layer: I²C servo wiring, the ESP-Claw port, a teach pendant that records and replays skills and tasks, the Lua bridge that triggers motions, browser camera and audio streaming, and the vision-module integration.
brief: An LLM agent on an ESP32-S3 turns plain-language requests into recorded motions on the open-source Coglet robot and reads on-board vision results.
facts: 9 servos :: driven over 2 I²C wires, shared with the vision module || ≈ 21 ms :: per-frame detection inference on the vision module || 640 × 480 :: MJPEG camera stream in the browser at 30 fps
---

## Summary

An LLM agent on a XIAO ESP32-S3 the size of a postage stamp controls the Coglet robot from everyday sentences. [Coglet](https://www.kickstarter.com/projects/willcogley/coglet-open-source-3d-printable-robot-companion-kit) is an open-source companion robot designed by Will Cogley. I reproduced its hardware and built the AI agent and control module with Espressif's ESP-Claw framework.

A microcontroller has a few hundred kilobytes of on-chip RAM and a few megabytes of PSRAM. Having an LLM set nine servo angles in real time would also be slow, unreliable and expensive.

ESP-Claw runs the agent loop in C on the chip and calls a cloud LLM over Wi-Fi only for reasoning. The LLM picks a named motion recorded on a teach pendant, and a Lua script replays it on the servos. A Grove Vision AI V2 module runs detection on its own neural processor and sends only results over I²C.

In a live terminal session, the agent read its own hardware and reported 6.20 MB of ~6.49 MB PSRAM free. Two requests that name no motion triggered the *sleepy* and *search* motions. The browser receives 640 × 480 MJPEG video at 30 fps plus 16 kHz PCM audio. Detection inference takes about 21 ms per frame on the vision module.

This build indicates that a stamp-sized board can drive a real robot through an agent that picks among tested motions.

## Design choices

| Task | Common approach | This build | Result here |
| --- | --- | --- | --- |
| Motion | The LLM sets servo angles in real time | The LLM picks a named skill or task, and a Lua script replays it | Requests with no motion name triggered the matching motions |
| Servo pulses | The MCU generates the pulses | A PCA9685 generates 12-bit PWM for up to 16 servos from I²C commands | 9 servos and the vision module share 2 I²C wires |
| Perception | Video leaves the robot for processing | A Grove Vision AI V2 runs detection on its Ethos-U55 neural processor | ≈ 21 ms per frame, with only boxes, labels and scores on the bus |
| Remote viewing | Install an app | The robot serves a web page with MJPEG video and PCM audio | 640 × 480 at 30 fps and 16 kHz audio in any browser on the network |

The LLM never touches raw angles. Named, recorded skills make behaviour reliable and safe. The model is good at choosing the right action and poor at producing smooth servo trajectories.

With PSRAM, the ESP32-S3 runs the agent loop, memory, web server, camera stream and motor control at the same time. Heavy reasoning goes to a cloud LLM.

## System architecture

One I²C bus links the ESP32-S3 to two helper chips: the PCA9685 servo driver and the Grove Vision AI V2.

<figure class="figure-media">
<a href="./images/projects/coglet/wiring.svg" target="_blank" rel="noreferrer"><img src="./images/projects/coglet/wiring.svg" alt="Wiring diagram: XIAO ESP32-S3 3V3, GND, GPIO5 and GPIO6 connect to the PCA9685's VCC, GND, SDA and SCL; the Grove Vision AI V2 shares SDA and SCL; a separate 5 V supply powers the servos through the PCA9685 screw terminal; 9 servos plug into channels 0-2, 4-6 and 8-10" loading="lazy"></a>
<figcaption>Two I²C wires (SDA on GPIO5, SCL on GPIO6) carry all control traffic. The servos have their own 5 V supply and share only ground with the board.</figcaption>
</figure>

<details>
<summary>Hardware and wiring</summary>

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/xiao-esp32s3-sense.jpg" alt="Seeed XIAO ESP32-S3 Sense: a thumb-sized board with a camera module and USB-C port" loading="lazy"><figcaption>XIAO ESP32-S3 Sense: dual-core MCU with Wi-Fi, extra PSRAM, camera and microphone. Product photo.</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/pca9685.jpg" alt="PCA9685 16-channel servo driver board with rows of three-pin servo headers and a screw terminal" loading="lazy"><figcaption>PCA9685: 16-channel, 12-bit PWM servo driver, controlled over I²C. Product photo.</figcaption></figure>
</div>

The MCU only sends commands like "channel 4 → 30°" over I²C, and the PCA9685 generates the servo pulses itself.

| Connection | Detail |
| --- | --- |
| I²C | XIAO GPIO5 → SDA, GPIO6 → SCL. 3V3 and GND go to the PCA9685's logic side (address 0x40). The vision module shares the same two wires. |
| Servo power | A separate 5 V supply on the PCA9685's screw terminal. Nine servos moving at once draw far more current than a USB-powered board can safely supply. The voltage sag would reset the MCU. |
| Servo channels | 0–2, 4–6 and 8–10 |

<figure class="figure-media figure-medium">
<img src="./images/projects/coglet/breadboard-wiring.jpg" alt="The actual build: the XIAO on a breadboard, wired to a PCA9685 board with many servo cables" loading="lazy">
<figcaption>The actual build: the XIAO on a breadboard (left) and the PCA9685 with the servo cables (right).</figcaption>
</figure>

</details>

<details>
<summary>ESP-Claw framework</summary>

[ESP-Claw](https://github.com/espressif/esp-claw) is Espressif's open-source AI agent framework for its own chips (Apache-2.0). Tools and Lua scripts define the actions the agent can take. New behaviour can be added as a Lua script without reflashing the firmware. An editable profile and long-term memory are stored on the device. Device events can trigger the agent, and simple rules run without calling the LLM.

I made ESP-Claw the brain of *this* robot. It runs on the XIAO, with tools for Coglet's body and interfaces around it. A serial terminal serves development, and a web chat served by the robot serves everyone else. Both reach the same agent and tools.

</details>

<details>
<summary>Building blocks in plain words</summary>

| Component | What it is | What it does here |
| --- | --- | --- |
| **Microcontroller (MCU)** | A small computer on one chip, built to control hardware, with no PC-style operating system | Runs the agent, Wi-Fi, the web pages and motor control |
| **Servo** | A small motor that turns to a commanded angle and holds it | Moves Coglet's ears, eyes, eyelids and head |
| **PWM servo driver** | A chip that generates the precise pulses servos need | The PCA9685 drives up to 16 servos |
| **I²C** | A two-wire bus (data + clock) shared by several chips | Connects the MCU to the servo driver and the vision module |
| **AI agent** | A program in which a language model chooses actions from a set of tools | Turns "take a nap" into the right motion |
| **Tool / script** | A function the agent is allowed to call | Lua scripts that read hardware info or play a motion |

</details>

## Results on hardware

### Plain-language control

For each request in the clip, the agent picks the matching skill, calls the Lua script and confirms in a reply.

<figure class="figure-media">
<video data-src="./images/projects/coglet/chat-control.mp4" muted loop playsinline preload="none" aria-label="Typing messages into the ESP-Claw web chat while Coglet acts them out: it gets sleepy when told to nap, then wakes up and searches when asked to help find something"></video>
<figcaption>Coglet acts out two everyday requests. "You're off work now, take a little nap" → Coglet gets sleepy. "Stop napping, get up and help me find something" → it wakes up and starts searching. English subtitles were added to the original Chinese chat, played at 1.25× speed.</figcaption>
</figure>

### Recorded motion skills

The teach pendant is a web page served by the robot. Motions are posed by hand, recorded as keyframes and saved under a name. A Lua script replays any skill or task by that name.

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-skill.png" alt="Teach pendant Skill tab: sliders for the servo channels, plus a Skill Recorder and Skill Player" loading="lazy"><figcaption><strong>Skill</strong> tab: pose each servo, record keyframes, then save and replay.</figcaption></figure>
<figure class="figure-media"><img src="./images/projects/coglet/teach-pendant-task.png" alt="Teach pendant Task tab: a skill pool, a task chain with up and down buttons, and a task player" loading="lazy"><figcaption><strong>Task</strong> tab: chain saved skills into a longer behaviour.</figcaption></figure>
</div>

<div class="figure-row">
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-sleepy.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet slowly drooping its eyelids and lowering its ears: the sleepy skill"></video><figcaption>The <strong>sleepy</strong> skill: eyelids droop and ears sag.</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/skill-search.mp4" muted loop playsinline preload="none" style="aspect-ratio: 9 / 16" aria-label="Coglet turning its head left and right with wide eyes: the search behaviour"></video><figcaption>The <strong>search</strong> behaviour: eyes wide, head scanning from side to side.</figcaption></figure>
</div>

<details>
<summary>Recording workflow</summary>

1. Pose each servo channel with the sliders or the ±5° buttons until Coglet looks right.
2. Record the pose as a keyframe, and repeat to build up a motion.
3. Save it as a skill. The keyframes, the interval between them in seconds and the loop-or-once setting go into a JSON file on the robot.
4. Chain saved skills into a task, such as *look up → turn right*, and save that too.

</details>

### Hardware self-report

The agent answers questions about itself from live tool readings. In the logged session it loaded its memory, skills and tools, then called a system-info tool. The web chat gives the same kind of answer.

<details>
<summary>Terminal session log</summary>

A terminal session in which I ask the robot about itself (translated from the original Chinese; network details removed):

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

</details>

<div class="chat-log">
<div class="chat-msg chat-user">Hi, tell me about this device's features and configuration.</div>
<div class="chat-msg chat-agent">Hi, the device is online. Here's an overview.<br><br><strong>Configuration:</strong> ESP32-S3 · rev 2 · dual-core · up ~36 s · 19 tasks running<br><strong>Memory:</strong> internal RAM 416,683 B total · 193,263 B free</div>
</div>

### Camera and audio streaming

The robot serves its camera and microphone to any browser on the network, with no app to install. The audio panel includes a live level meter.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/coglet/camera-stream.mp4" muted loop playsinline preload="none" style="aspect-ratio: 900 / 1080" aria-label="Browser page showing Coglet's live camera view of the room as its head turns, with an audio streaming panel below"></video>
<figcaption>The browser shows Coglet's live camera view as its head turns. The audio stream panel sits below the video. Faces are blurred.</figcaption>
</figure>

### On-device detection

Detection runs on the vision module, so video never leaves the robot and the MCU stays free. Its Himax WiseEye2 chip includes an Arm Ethos-U55 neural processor. Only boxes, labels and confidence scores travel over I²C. The agent reads them through a tool, so it can answer *"is anyone in front of you?"* or react when a person appears.

<div class="figure-row">
<figure class="figure-media"><img src="./images/projects/coglet/grove-vision-ai-v2.jpg" alt="Grove Vision AI V2 board with a camera connector and USB-C port" loading="lazy"><figcaption>Grove Vision AI V2. Product photo.</figcaption></figure>
<figure class="figure-media"><video data-src="./images/projects/coglet/vision-face-detection.mp4" muted loop playsinline preload="none" style="aspect-ratio: 940 / 690" aria-label="Face detection running on the vision module: a red box labelled face, with a confidence score, follows a face while the device log prints the detected boxes"></video><figcaption>Face detection runs on the module itself. The left side shows the bounding box and confidence. The right side shows the raw results the module sends.</figcaption></figure>
</div>

## Related

- [VR Teleoperation Platform](#/projects/vr-teleoperation): controlling larger robots in real time
- Before this, I also ran a lighter version of the agent, zero-Claw, on a Raspberry Pi.
