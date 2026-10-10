# AGENTS.md — Pirate Battle

This file defines the permanent engineering and collaboration rules for the Pirate Battle technical challenge.

The challenge README is the primary source of product and technical requirements.

## 1. Mission

Build a complete 2D top-down naval shooter that satisfies the technical challenge requirements with clear architecture, reliable gameplay, reproducible tests and a production-ready delivery.

The goal is not to demonstrate unnecessary complexity.

The goal is to deliver a robust, understandable and verifiable solution.

## 2. Mandatory stack

The application must use:

- React for menus, forms, panels and dialogs;
- TypeScript in strict mode;
- PixiJS for the game arena and rendering;
- TanStack Query for remote ranking and match history state;
- Axios for HTTP communication;
- MSW for API mocking;
- Playwright for E2E and visual regression tests.

All mandatory technologies must participate meaningfully in the solution.

## 3. Architecture

Keep the following responsibilities separated:

- game simulation;
- rendering;
- input;
- UI state;
- remote data.

Continuous combat state belongs to the game simulation.

React must not re-render on every game frame.

PixiJS is responsible for rendering:

- arena;
- ships;
- projectiles;
- effects;
- health indicators.

React is responsible for:

- menus;
- options;
- ranking;
- match history;
- result screen;
- dialogs and semantic UI.

## 4. Game simulation

Gameplay must be frame-rate independent.

Movement, cooldowns, projectiles, spawning and timers must use elapsed simulation time rather than frame count.

Gameplay parameters must live in a centralized typed configuration.

Avoid magic numbers inside systems.

Balance changes must not require changing gameplay logic.

## 5. Resource lifecycle

Assets must be loaded and reused deliberately.

Always clean up:

- PixiJS ticker callbacks;
- event listeners;
- timers;
- input handlers;
- game entities;
- temporary resources.

Initialization and teardown must remain correct under React Strict Mode.

## 6. Input

Keyboard and touch controls must support simultaneous movement and attacks.

Gameplay keys must only be captured while gameplay is active.

Paused gameplay must not accumulate movement or firing input.

## 7. Testing

Tests must validate behavior rather than implementation details.

Gameplay tests should use deterministic:

- random seeds;
- simulation time;
- network scenarios.

Prioritize:

- gameplay rules;
- collisions;
- combat;
- enemy behavior;
- match lifecycle;
- persistence;
- ranking/history consistency;
- regressions.

Do not add tests only to increase coverage numbers.

## 8. Performance

Target 60 FPS in the documented reference environment.

Measure before optimizing.

Avoid unnecessary allocations and React updates during gameplay.

Resource cleanup must prevent continuous memory growth across repeated game sessions.

## 9. Accessibility

Accessibility is part of the implementation.

Menus must support keyboard navigation and visible focus.

Game state such as score, remaining time and match status must also be available through semantic HTML without frame-by-frame announcements.

## 10. Development workflow

Every relevant unit of work should be associated with a GitHub Issue.

Preferred workflow:

Issue
→ branch
→ implementation
→ validation
→ Pull Request
→ CI
→ squash merge
→ Release Please

Do not commit directly to `main`.

Use Conventional Commits.

Examples:

- `feat:`
- `fix:`
- `test:`
- `docs:`
- `chore:`

Keep pull requests focused and small whenever practical.

## 11. Engineering principles

Prefer:

- simplicity;
- clear responsibilities;
- low coupling;
- high cohesion;
- explicit contracts;
- testability;
- accessibility;
- measured performance.

Avoid speculative architecture.

Do not introduce dependencies, abstractions or patterns without a concrete problem they solve.

## 12. Decision rule

When requirements conflict with implementation preferences, the challenge specification wins.

When multiple valid implementations exist, prefer the smallest solution that:

1. satisfies the requirement;
2. remains testable;
3. keeps responsibilities clear;
4. can be explained in `ARCHITECTURE.md`.

## 13. Delivery quality

A feature is not complete merely because it appears to work.

Relevant validation may include:

- lint;
- type checking;
- build;
- E2E tests;
- visual regression;
- accessibility;
- responsive behavior;
- performance;
- console inspection.

The expected final state is a reproducible project that runs from a clean checkout without private services.
