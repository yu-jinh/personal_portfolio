---
title: Digital Twin in Mixed Reality: Robot Data Inside a Quest Headset
summary: One Quest app shows a remote robot's world in mixed reality: per-eye stereo video, depth point clouds, PLY scans, a live URDF twin and detected objects at their 6D poses.
role: Built the visualization stack end to end: the stereo and point-cloud shaders, the depth and PLY renderers, the runtime URDF loader and joint sync, and the pipeline that brings object poses into the robot's base frame.
brief: Brings a remote robot's world into a Quest headset: stereo video, depth point clouds, a URDF twin synced at 15 Hz and object 6D poses.
facts: 15 Hz :: robot joint angles streamed to the twin || 2.2 M :: points in the PLY scan demo, drawn in one call || 2 tracks :: left and right stereo video, one per eye
---

## Summary

A single Quest app shows an operator a remote robot's world in mixed reality. Stereo video, live depth, scanned scenes, the robot's joint state and nearby objects all appear in one view.

A flat video feed hides distance, so a remote operator struggles to judge depth and act safely. Each data type also needs its own rendering path. Object poses arrive in the camera's frame and must be moved into the robot's.

A GPU renderer turns depth video into one point per pixel. The URDF twin downloads at runtime and follows joint angles streamed at 15 Hz. A chain of rigid transforms carries FoundationPose estimates into the robot's base frame.

The recordings below show an operator picking up a glove using only the stereo stream from a remote 2K camera. A 2.2-million-point PLY scan of a subway car renders in a single draw call and can be explored from inside. A dual-arm xArm 7 twin mirrors the real arms during teleoperation. Detected objects appear on the twin's table in the robot's frame.

The live streams reuse the LiveKit rooms of my [teleoperation platform](#/projects/vr-teleoperation), so no new streaming service was needed. A new robot needs only a URDF upload, with no new app build.

## Design advantages

| Conventional approach | This solution | Shown in demos |
| --- | --- | --- |
| A single video feed, which looks flat | A ZED 2i stereo camera sends two video tracks, one per eye | Glove picked up using only the stereo stream |
| A robot model built into the app | URDF downloaded from S3 at runtime, driven by a 15 Hz joint-angle stream | Theta Intelligence robot and xArm 7 loaded as twins |
| A separate streaming service | Live streams share the teleoperation platform's LiveKit rooms | Video, depth, joint states and object poses share existing rooms |
| PnP with hand-picked 2D–3D feature matches | FoundationPose matches the image against the object's 3D model | Everyday objects placed without markers or special texture |

Rendering stays on the GPU. Custom shaders handle the per-eye video, and each point cloud is drawn in a single call. That is what lets multi-million-point scans render on a standalone headset.

## How data reaches the headset

<figure class="figure-media">
<a href="./images/projects/digital-twin/data-flow.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/data-flow.svg" alt="Data flow: a ZED 2i stereo camera and a depth camera send video tracks through a LiveKit room; a PLY file is loaded on the headset; robot joint angles at 15 Hz and object 6D poses travel over the LiveKit data channel; URDF models are fetched from an S3 bucket at runtime; inside the Quest, a stereo shader, a depth point-cloud renderer, a PLY renderer, the URDF robot twin and object markers each draw their own stream" loading="lazy"></a>
<figcaption>Each stream has its own renderer on the headset. Live streams pass through a LiveKit room, while PLY scans and URDF files load separately.</figcaption>
</figure>

Video, depth and audio travel as media tracks, while joint angles and object poses use the room's data channel. Robot URDFs download from an S3 bucket at runtime. The panels also play the remote microphone with a level meter.

<details>
<summary>Building blocks in plain words</summary>

| Building block | What it is | Its job here |
| --- | --- | --- |
| **Digital twin** | A live virtual copy of a real object that updates as the object changes | A virtual robot and scene that mirror the real ones |
| **Shader** | A small program that runs on the graphics chip (GPU) and decides how each pixel or point is drawn | Shows each eye its own image; turns depth into 3D points |
| **Stereo camera** | Two cameras side by side, like a pair of eyes | Gives the headset two slightly different views, so the brain perceives depth |
| **Depth camera / point cloud** | A camera that measures the distance to every pixel; a point cloud is the resulting set of 3D points | Rebuilds the scene in 3D so you can look around it |
| **PLY file** | A common file format for storing point clouds | Loads pre-scanned 3D scenes into the headset |
| **URDF** | The standard format for describing a robot's links, joints and 3D meshes | Builds the virtual robot from the same description the real one uses |
| **6D pose** | An object's position (x, y, z) plus its orientation (three rotation angles) | Places detected objects exactly where they are in reality |

</details>

## Results in the headset

### Stereo video with depth

A ZED 2i stereo camera streams two video tracks, left and right, which arrive on the headset as GPU textures. A custom Unity shader then shows each eye the image from its own camera.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/stereo-glove.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a stereo video panel from a remote camera; the operator's arm reaches into the scene and picks up a glove"></video>
<figcaption>Real depth cues let the operator pick up a glove using only a remote 2K camera's stereo stream. Headset recordings capture only one eye, so the depth effect itself can't be shown here. 1.25× speed.</figcaption>
</figure>

<details>
<summary>Per-eye shader</summary>

```hlsl
UNITY_SETUP_STEREO_EYE_INDEX_POST_VERTEX(i);
if (unity_StereoEyeIndex == 0)      // left eye
    return tex2D(_MainTexLeft,  TRANSFORM_TEX(i.uv, _MainTexLeft));
else                                // right eye
    return tex2D(_MainTexRight, TRANSFORM_TEX(i.uv, _MainTexRight));
```

The headset renders both eyes in one pass. The shader checks which eye it is drawing (`unity_StereoEyeIndex`) and samples the matching texture. The brain fuses the two views as it does with real eyes.

</details>

### Live depth point clouds

A depth stream turns the remote room into geometry the operator can walk around. The camera sends colour and depth as separate video tracks. A GPU renderer draws one point per pixel and pushes each point along its viewing ray by that pixel's depth. Two sliders set the depth scale and the point size.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/depth-point-cloud.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a live point cloud of a room built from depth video, with the perspective changing as the viewer moves"></video>
<figcaption>The point cloud built live from depth video is real geometry. As the viewpoint moves, edges separate from what is behind them. 2× speed.</figcaption>
</figure>

### Scanned PLY scenes

Pre-scanned scenes load from binary PLY files into a GPU buffer and render in a single draw call. The cloud sits inside a box the user can grab, move and scale. The demo is a 2.2-million-point subway-car scan, scaled up until the user can stand inside it.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/ply-subway.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: the viewer grabs a small point-cloud model of a subway car inside a box and scales it up until they are standing inside the carriage"></video>
<figcaption>The full 2.2-million-point subway car can be grabbed, scaled up and explored from inside. The scan comes from an open-source dataset. 1.25× speed. Faces in the background are blurred.</figcaption>
</figure>

### URDF robot twin

The virtual robot is built from the real robot's URDF, downloaded from an S3 bucket at runtime. Joint angles arrive at 15 Hz over the LiveKit data channel used for teleoperation. The headset applies them to the matching joints of the model.

The twin can be placed in three ways. An ArUco marker aligns it exactly with the real robot. Users can also grab it and drop it anywhere, such as onto a table. A third mode follows the robot's navigation map, so a mobile robot's twin moves through the room with it.

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/robot-twin.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Mixed reality: white virtual robot models appear next to the real robots; a dual-arm xArm twin on a table copies the real arms as the operator teleoperates them"></video>
<figcaption>While the operator teleoperates, the xArm twin mirrors the real arms behind it. A Theta Intelligence robot and a dual-arm xArm 7 are both loaded as twins in mixed reality. 1.5× speed. Faces are blurred.</figcaption>
</figure>

### Objects in the robot frame

Detected objects appear on the twin's table where they sit on the real one. A calibrated camera watches the workspace, and FoundationPose estimates each object's 6D pose from its 3D model. That pose is in the camera's frame, so a chain of rigid transforms carries it into the robot's frame.

<figure class="figure-media">
<a href="./images/projects/digital-twin/frame-chain.svg" target="_blank" rel="noreferrer"><img src="./images/projects/digital-twin/frame-chain.svg" alt="Frame chain: object to camera via FoundationPose, camera to robot base via ArUco hand-eye calibration, robot base to the twin in AR via twin placement" loading="lazy"></a>
<figcaption>Multiplying the transforms in order carries an object from the camera's view onto the twin's table. Each arrow is one rigid transform.</figcaption>
</figure>

<figure class="figure-media figure-medium">
<video data-src="./images/projects/digital-twin/object-poses.mp4" muted loop playsinline preload="none" style="aspect-ratio: 1 / 1" aria-label="Through the headset: a virtual table with the dual-arm twin; small blue boxes mark detected objects while the perception pipeline runs on the monitor behind"></video>
<figcaption>Detected objects (blue boxes) sit on the twin's table in the robot's frame. The perception pipeline runs on the monitor behind. 1.25× speed.</figcaption>
</figure>

<details>
<summary>Transform chain and calibration</summary>

Writing $T_{A \leftarrow B}$ for "the transform that converts coordinates in frame $B$ into frame $A$":

$$
T_{\text{base} \leftarrow \text{object}} = T_{\text{base} \leftarrow \text{camera}} \; T_{\text{camera} \leftarrow \text{object}}
$$

- $T_{\text{camera} \leftarrow \text{object}}$ comes from FoundationPose, every frame.
- $T_{\text{base} \leftarrow \text{camera}}$ comes from a one-time hand-eye calibration with ArUco markers. If a calibration tool reports the opposite direction, $T_{\text{camera} \leftarrow \text{base}}$, invert it first. Also check whether the result refers to the robot base or to the calibration board.

</details>

<details>
<summary>Classic PnP compared</summary>

Before learned models like FoundationPose, the standard method was PnP (Perspective-n-Point). It solves for an object's pose relative to the camera from a few known 3D points and their image positions. OpenCV's implementation takes the 3D points, their 2D pixel positions, the camera intrinsics $K$ and the distortion coefficients. It returns a rotation $R$ and a translation $t$:

> 1. Define a coordinate frame on the object and measure a few feature points in 3D.
> 2. Find those points' pixel positions in the image.
> 3. Solve for $R, t$ with `cv2.solvePnPRansac()`.
> 4. Reproject the 3D points into the image and check the error.
> 5. Transform the pose into the target frame with the camera extrinsics.

Step 2, finding reliable 2D–3D matches, is almost always the hard part. Occlusion and reflections break it. Symmetric objects are ambiguous: a textureless cylinder looks the same however it is rotated about its own axis. FoundationPose instead matches the image against the object's 3D model. It works on everyday objects with no markers or special texture.

</details>

## Related

- [VR Teleoperation Platform](#/projects/vr-teleoperation): the rooms, robots and streaming infrastructure this project builds on
- [EGO Data Collection](#/projects/ego-data-collection): another Quest app built around stereo camera video
