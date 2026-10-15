---
title: Digital Twin in Mixed Reality: Robot Data Inside a Quest Headset
summary: Bringing the real world into a Meta Quest headset as live, layered data: stereo video with real depth, depth-camera point clouds, scanned 3D scenes, a URDF robot twin that moves with the real robot, and detected objects placed at their true 6D poses.
role: Built the visualization stack end to end: the stereo and point-cloud shaders, the depth and PLY renderers, the runtime URDF loader and joint sync, and the object-pose pipeline into the robot base frame.
brief: Bringing a remote robot's surroundings into the headset: per-eye stereo video, depth point clouds, a URDF twin synced to the real robot, and detected objects at their 6D poses.
facts: 15 Hz :: robot joint-state sync || 2.2 M :: points in the PLY scan demo || 2 tracks :: left/right stereo video
---

## At a glance

- **What:** A mixed-reality view where an operator sees a robot's world from inside a Quest headset: video, depth, 3D scans, the robot's live state and the objects around it, all at once
- **Why:** Remote operators need more than a flat video feed. Depth, geometry and robot state make it possible to judge distances and act safely without being in the room.
- **Main parts:** Per-eye stereo shader for true depth perception · one GPU point per pixel from depth video · millions-of-points PLY scans · URDF robots loaded at runtime from the cloud, synced at 15 Hz · FoundationPose object poses in the robot's frame · everything over the same LiveKit infrastructure as my [teleoperation platform](#/projects/vr-teleoperation)

## The building blocks, in plain words

| Building block | What it is | Its job here |
| --- | --- | --- |
| **Digital twin** | A live virtual copy of a real thing that updates as the real one changes | A virtual robot and scene that mirror the real ones |
| **Shader** | A small program that runs on the graphics chip (GPU) and decides how each pixel or point is drawn | Shows each eye its own image; turns depth into 3D points |
| **Stereo camera** | Two cameras side by side, like a pair of eyes | Gives the headset two slightly different views, so the brain perceives depth |
| **Depth camera / point cloud** | A camera that measures distance for every pixel; a point cloud is the 3D dots that result | Rebuilds the scene in 3D so you can look around it |
| **PLY file** | A common file format for storing point clouds | Loads pre-scanned 3D scenes into the headset |
| **URDF** | The standard robot description format: a robot's links, joints and 3D meshes | Builds the virtual robot from the same description the real one uses |
| **6D pose** | Position (x, y, z) plus orientation (three rotation angles) of an object | Places detected objects exactly where they are in reality |

## How the data reaches the headset

<figure class="figure-media">
<a href="./images/projects/digital-twin/data-flow.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/data-flow.svg" alt="Data flow: a ZED 2i stereo camera and a depth camera send video tracks through a LiveKit room; a PLY file is loaded on the headset; robot joint angles at 15 Hz and object 6D poses travel over the LiveKit data channel; URDF models come from an S3 bucket at runtime; inside the Quest, a stereo shader, depth point-cloud renderer, PLY renderer, URDF robot twin and object markers draw each stream" loading="lazy"></a>
<figcaption>Every stream has its own renderer on the headset. Live streams share the LiveKit infrastructure from the teleoperation platform.</figcaption>
</figure>

Live video, depth and audio travel as tracks through a **LiveKit room**, the same infrastructure as my [teleoperation platform](#/projects/vr-teleoperation), and small structured data (joint angles, object poses) goes over its **data channel**. Static assets come from storage: PLY scans are loaded on the headset, and robot URDFs are downloaded from an **S3 bucket at runtime**. The panels also carry **audio** (the remote microphone, with a level meter), so the operator can hear the scene as well as see it.

## Seeing the remote scene

### Stereo video: depth you can feel

A single video feed looks flat. To keep depth, a **ZED 2i stereo camera** streams **two video tracks**, left and right, into the headset, where they arrive as GPU textures. A custom **Unity shader** then shows each eye its own camera:

```hlsl
UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(i);
if (unity_StereoEyeIndex == 0)      // left eye
    return tex2D(_MainTexLeft,  TRANSFORM_TEX(i.uv, _MainTexLeft));
else                                // right eye
    return tex2D(_MainTexRight, TRANSFORM_TEX(i.uv, _MainTexRight));
```

Because the headset renders both eyes in one pass, the shader asks which eye it's drawing (`unity_StereoEyeIndex`) and samples the matching texture. Your brain fuses the two views just as it does with real eyes, and the scene gains depth.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/stereo-glove.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a stereo video panel from a remote camera; the operator's arm reaches into the scene and picks up a glove"></video>
<figcaption>Reaching for a glove while looking only at the stereo stream from a remote 2K camera. The real depth cue is what makes this easy. A headset recording captures one eye, so the depth effect itself can't be shown here. 1.25× speed.</figcaption>
</figure>

### Depth camera to live point cloud

A stereo pair gives depth to your eyes; a **depth stream** gives it to the computer. The camera sends a colour video and a depth video, each as its own track. On the headset, a GPU renderer draws **one point per pixel** and pushes each point out along its viewing ray by that pixel's depth, so the flat image becomes a 3D surface you can walk around. A slider sets the depth scale and another the point size.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/depth-point-cloud.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a live point cloud of a room built from depth video, changing perspective as the viewer moves"></video>
<figcaption>A live point cloud built from depth video. As the viewpoint moves, edges separate from what's behind them: the scene is geometry, not a flat picture. 2× speed.</figcaption>
</figure>

### Scanned scenes from PLY files

Not everything needs to be live. **PLY files** store pre-scanned 3D scenes. My loader reads binary PLY files into a GPU buffer and draws every point in a single draw call, inside a box the user can grab, move and scale. The demo is a **2.2-million-point** scan of a subway car from an open-source dataset, scaled up until you can stand inside it.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/ply-subway.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a small point-cloud model of a subway car inside a box is grabbed and scaled up until the viewer is inside the carriage"></video>
<figcaption>A 2.2-million-point subway car (from an open-source dataset), grabbed, scaled up and explored from inside. 1.25× speed. Faces in the background are blurred.</figcaption>
</figure>

## The robot's state, live

### URDF robot twin

The headset builds the virtual robot from the robot's own **URDF** description, **downloaded at runtime from an S3 bucket**. A new robot needs only a new URDF upload, not a new app build. The twin then follows the real robot: its **joint angles arrive at 15 Hz** over the same LiveKit data channel used for teleoperation, and are applied to the matching joints of the model.

The twin can be placed in three ways:

- **ArUco marker:** for exact alignment with the real robot
- **Grab and drop:** move it anywhere, such as onto a table in front of you
- **Navigation map:** placed live from the robot's own navigation map, so a mobile robot's twin moves through the room as it does

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/robot-twin.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Mixed reality: virtual white robot models appear next to real robots; a dual-arm xArm twin sits on a table and copies the real arms as the operator teleoperates"></video>
<figcaption>A Theta Intelligence robot and a dual-arm xArm 7 loaded as twins in mixed reality. The xArm twin mirrors the real arms behind it while the operator teleoperates. 1.5× speed. Faces are blurred.</figcaption>
</figure>

### Detected objects at their real poses

The twin shows the robot; the scene around it needs the **objects**. A calibrated camera looks at the workspace, and **FoundationPose** estimates each object's **6D pose** relative to the camera from the object's 3D model. That pose is still in the *camera's* frame, so it's carried into the *robot's* frame through a chain of transforms:

<figure class="figure-media">
<a href="./images/projects/digital-twin/frame-chain.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/frame-chain.svg" alt="Frame chain: object to camera via FoundationPose, camera to robot base via ArUco hand-eye calibration, robot base to the twin in AR via twin placement" loading="lazy"></a>
<figcaption>Each arrow is one rigid transform. Multiplying them in order carries an object from the camera's view onto the twin's table.</figcaption>
</figure>

Writing $T_{A \leftarrow B}$ for "the transform that converts coordinates in frame $B$ into frame $A$":

$$
T_{\text{base} \leftarrow \text{object}} = T_{\text{base} \leftarrow \text{camera}} \; T_{\text{camera} \leftarrow \text{object}}
$$

- $T_{\text{camera} \leftarrow \text{object}}$ comes from **FoundationPose**, per frame.
- $T_{\text{base} \leftarrow \text{camera}}$ comes from a one-time **hand-eye calibration** with ArUco markers. If a calibration tool reports the opposite direction, $T_{\text{camera} \leftarrow \text{base}}$, it must be inverted first, and it matters whether it refers to the robot base or the calibration board.

The resulting poses go over the room's data channel and appear as boxes on the twin's table, exactly where the objects sit on the real one.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/object-poses.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a virtual table with the dual-arm twin; small blue boxes mark detected objects while the perception pipeline runs on the monitor behind"></video>
<figcaption>Detected objects (blue boxes) placed on the twin's table in the robot's frame, while the perception pipeline runs on the monitor behind. 1.25× speed.</figcaption>
</figure>

**How classic pose estimation works.** Before learned models like FoundationPose, the standard method was **PnP** (Perspective-n-Point): given the 3D positions of a few points on an object and where they appear in the image, solve for the camera-relative pose. OpenCV's version takes the 3D points, their 2D pixels, the camera intrinsics $K$ and the distortion coefficients, and returns a rotation $R$ and translation $t$:

> 1. Define a coordinate frame on the object and measure a few feature points in 3D.
> 2. Find those points' pixel positions in the image.
> 3. Solve for $R, t$ with `cv2.solvePnPRansac()`.
> 4. Reproject the 3D points into the image and check the error.
> 5. Transform the pose into the target frame with the camera extrinsics.

The hard part is almost always step 2: finding reliable 2D–3D matches. Occlusion and reflections break it, and symmetric objects are ambiguous; a textureless cylinder looks the same however it's turned about its own axis. FoundationPose sidesteps hand-picked features by matching the image against the object's 3D model, so it works on everyday objects with no markers or special texture.

## Design decisions

- **One renderer per data type.** Stereo video, depth, point clouds, robot state and object poses each get a renderer built for that data, all inside one headset app.
- **Rendering on the GPU.** Custom shaders handle the per-eye video, and each point cloud is drawn in a single call, so multi-million-point scans stay smooth on a standalone headset.
- **Robots as data, not code.** A URDF from cloud storage plus a joint-state stream is all a new robot needs to appear as a twin.
- **Shared infrastructure.** Everything travels through the LiveKit rooms of the [teleoperation platform](#/projects/vr-teleoperation), so no new streaming service was needed.

## Related

- [VR Teleoperation Platform](#/projects/vr-teleoperation): the rooms, robots and streaming infrastructure this builds on
- [EGO Data Collection](#/projects/ego-data-collection): another use of external UVC cameras inside the Quest
