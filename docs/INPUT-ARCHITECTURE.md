# Input architecture / migration contract

## Layers

`Device adapters → logical action frame → InputManager → active context → consumer`

- `src/input/input-actions.json`: versioned action/map/context contract. Does not contain DOM or game state.
- `src/input/input-manager.js`: pure arbitration, context priority, modal consumption, button release suppression and current control scheme. No device indices, browser or game imports.
- `src/input/browser-input.js`: DOM keyboard/pointer/touch and Gamepad API adapter. Converts hardware into gameplay actions and UI actions. Raw controls are exposed only for rebinding. Browser-native pointer clicks, select controls, Tab and Enter/Space activation remain the UI platform adapter's responsibility.
- `src/gamepad-input.js`: standard controller mapping, deadzone/hysteresis, independent device history, selection by actual activity and hot unplug/reconnect.
- `src/settings-store.js`: persisted binding overrides. Xbox and PlayStation profiles are independent; switching active schemes does not disable devices.
- `src/main.js`: composition root registering context activation and consumers. Its gameplay consumer currently translates logical held actions into the existing `keys` Set. That Set is a compatibility bridge for the old movement code, not the public input API.
- Settings, skill tree and bestiary consume logical UI commands. They do not decide whether gameplay should receive input.

## Action frame

`held` and `pressed`: gameplay actions (`left`, `right`, `forward`, `back`, `jump`, `dash`, `flare`, `pause`).

`move`: Axis2D derived from movement actions; the current adapter preserves the prototype's digital movement.

`uiHeld` and `uiPressed`: `left`, `right`, `up`, `down`, `submit`, `cancel`, `previousTab`, `nextTab`, `menu`. These are the discrete representation of UI Navigate and button actions.

`released`: delivered actions that have ended. `scheme`: keyboardMouse / xbox / playstation / touch, for prompts and presentation only.

`globalPressed`: application commands such as fullscreen. `focused`: authority supplied by the platform adapter (actual Electron window focus in desktop builds).

Raw keyboard codes / controller tokens are private adapter and rebinding data. Never branch on them in gameplay or menu consumers.

## Context precedence

| Context | Priority | Behavior |
| --- | ---: | --- |
| Global | 2000 | Always processed first, including loss of focus; does not pass its reserved commands into gameplay |
| Rebinding | 1000 | Captures a binding; gameplay remains blocked |
| Settings | 900 | Modal settings UI |
| Upgrades | 800 | Modal skill selection / purchase / next run |
| Bestiary | 700 | Modal bestiary navigation |
| Pause | 600 | Pause menu |
| MainMenu | 500 | Main menu |
| Gameplay | 0 | Movement and abilities |

All enabled nonmodal global contexts run first. Exactly one highest-priority modal context receives the remaining frame. No implicit fallback to gameplay when an overlay has nothing to do.

On context transition, actions already held on the previous screen remain blocked until released. Losing focus clears transient keyboard/touch state and pauses gameplay. Disconnected controllers release their contribution; history is stored per controller, so another pad can take over without a restart. Bind conflicts swap controls within the selected profile.

## Unreal Enhanced Input

- Create Input Actions from the JSON contract: Move/Navigate Axis2D, button actions, Point Vector2.
- Create Input Mapping Contexts for gameplay, UI and global commands. Preserve the priority rules above; modal UI must consume lower-priority actions.
- Enable global mappings throughout the application's lifetime. Activate UI mappings according to screen visibility, independently from a run's won/lost state.
- Use Started for discrete presses, Triggered/Value for held movement, Completed/Canceled for releases. Preserve the release-before-rearm rule when replacing contexts.
- Convert saved browser bindings to Unreal input keys through a platform binding adapter; browser key codes are not Unreal keys.

## Unity Input System

- Recreate Action Maps Global / Gameplay / UI and the same action names/value types in an `.inputactions` asset.
- Use KeyboardMouse and Gamepad control schemes. Xbox/PlayStation are prompt/profile families within gamepad support; keep an explicit policy if Steam Input presents a Sony pad as an Xbox pad.
- Keep Global enabled. Enable the active modal UI map/consumer and disable gameplay actions while it is open. Unity does not automatically reproduce our priority stack: preserve it in the application context service.
- Connect UI Navigate/Submit/Cancel/Point/Click through InputSystemUIInputModule and use interactive rebinding plus binding overrides for settings.
- Map started/performed/canceled and ReadValue to the same consumer contract, including cancellation and release suppression at transitions.

The architecture and action contract transfer; JavaScript, DOM rendering, persistence paths and browser binding strings still require engine-specific implementations. This is not an automatic source-code conversion.

Reference: [Unity Input System control schemes](https://github.com/Unity-Technologies/InputSystem/blob/develop/Packages/com.unity.inputsystem/Documentation~/control-schemes.md), [Unity UI action map](https://github.com/Unity-Technologies/InputSystem/blob/develop/Packages/com.unity.inputsystem/Documentation~/configure-ui-input-action-map.md), [Unreal Engine's introduction to Enhanced Input actions and mapping contexts](https://www.youtube.com/watch?v=TiDo_J4VOFA).

## Verification

Targeted tests cover context priority, global precedence, repeated transitions, blocked held confirmations, focus loss, controller switching/disconnect, profile migration and spatial skill-tree navigation. Physical controller and OS/driver checks remain separate from these automated tests.
