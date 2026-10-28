# Tanong402 mascot: Kuwago

## 3D character

Kuwago is also delivered as a smooth, poseable 3D toy character. The model uses a pear-shaped pearl-silver torso, a separate rounded head and face disc, large glossy eyes with icy-blue irises and two catchlights, a small beak, soft ear tufts, a blue question-mark curl, shoulder-pivot wings, and hip-pivot feet. The meshes are separate and named in the GLB so the character can be inspected and posed as a real model.

- Source: [`UI/mascot/3d/kuwago.js`](../../UI/mascot/3d/kuwago.js)
- Interactive GLB viewer: [`UI/mascot/3d/viewer.html`](../../UI/mascot/3d/viewer.html)
- Binary model: `apps/web/public/mascot/kuwago.glb`
- Pose board: [`UI/mascot/mascot-3d-board.html`](../../UI/mascot/mascot-3d-board.html) and its rendered PNG companion.

### Materials and lighting

The body uses a pearl-satin `MeshPhysicalMaterial` with subtle metalness, roughness around 0.46, a restrained clearcoat, and a soft sheen. The face and belly use slightly varied silver values to preserve the layered sculpted form. The eyes use glossy white sclera, moonlight-blue irises, dark pupils, and paired highlights. The curl uses a moonlight-blue clearcoat finish. A PMREM `RoomEnvironment` provides broad reflections; a warm studio key, cool fill, and `#8FB3FF` upper-right rim light shape the body. The render uses ACES filmic tone mapping, a transparent canvas, 2× supersampling, and a soft radial contact shadow.

### Re-rendering

The source is an ES module built with Three.js. The render workspace and Playwright runner live outside this repository in `/tmp/kuwago3d`; run `node build.mjs` there to regenerate all eight 1024 px and 512 px transparent WebP poses and the GLB. The runner launches the available headless Chromium with SwiftShader and encodes the 2× render down to final size. `viewer.html` loads the exported GLB with OrbitControls and a CDN import map; serve the repository root over HTTP to inspect it.

The flat SVG drawings remain in place as existing fallbacks. The WebP pose exports are the preferred 3D artwork when present.

## Character

Kuwago is a curious, patient pearl-silver night owl. Its round head/body, paired icy-blue eyes, tiny beak, and question-mark curl stay recognizable in every pose. The silver body uses soft inner gradients, a cool rim light (`#8FB3FF`) from the upper right, and a faint ambient shadow. The artwork has no hard black outlines and stays transparent in a 512 × 512 viewBox.

## Palette and finish

- Pearl silver: `#FFFFFF`, `#E6EAF0`, `#C7CED9`, `#9CA7B6`.
- Moonlit blue: `#8FB3FF` with softer highlights and muted steel-blue eye shading.
- Background checks: midnight `#07090F` and silver `#F4F5F7`.
- Props and sparkles stay large and quiet enough to read at 64 px; check the 320 px artwork for the full shading and detail.

## Poses

| Pose | Distinct silhouette and use |
| --- | --- |
| `wave` | Leans toward the viewer, body tipped, one open wing raised high; joyful face. The raised wing is `g#wing` and has a documented transform origin for CSS rotation. | Hero greeting and final call to action |
| `invite` | Both wings reach forward around a card offered toward the viewer; head and smile feel proud. | Invitation and onboarding |
| `thinking` | Head tilted, eyes glance up and aside, one wing at the chin, feet set wide; question spark above. | FAQ and question moments |
| `reading` | Seated posture, bowed head and downward gaze; both wings hold an open book low. | Study and question steps |
| `celebrate` | Mid-jump, both feet lifted, wings form a V; coin, sparkles, confetti, and motion marks carry the burst. | Answered and success states |
| `sleepy` | Slumped into a pillow, head drooping and eyes closed, with a soft z curl. | Empty and gentle error states |
| `peek` | Only the upper half appears over a ledge; both wings grip its edge. | Hero corners and compact decoration |
| `point` | One wing extends sideways to direct attention; the other rests at the hip. | Button and feature callouts |

The board at `UI/mascot/mascot-board.html` shows all eight poses on both target backgrounds at 64, 128, and 320 px, followed by a black silhouette-only row to compare gesture shapes without facial or prop detail.
