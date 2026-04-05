# Permissions Deep Dive

Last updated: 2026-04-01

## Scope

This pass focused on:

- `src/utils/permissions/permissions.ts`
- nearby permission concepts exposed through decision reasons and rule matching

## Core Reading

This permission layer is not a simple allow/deny switch.

It is a composed decision system with:

1. multiple rule sources
   - settings
   - cliArg
   - command
   - session

2. multiple decision reasons
   - hook
   - rule
   - subcommandResults
   - permissionPromptTool
   - sandboxOverride
   - workingDir
   - safetyCheck
   - mode
   - asyncAgent
   - classifier

3. special matching logic for:
   - MCP tool names
   - server-level MCP permissions
   - `Agent(agentType)` rules
   - Bash subcommands and redirection-aware display

4. denial tracking and fallback behavior

## Valuable Designs

### 1. Permission sources are explicit and layered

Design:

- The system does not pretend there is only one place where permissions come from.

Problem solved:

- Reduces ambiguity when a session-level override conflicts with baseline settings.

Openclaw implication:

- `openclaw` should define a clear precedence chain early:
  - operator config
  - session override
  - command/runtime override

Priority:

- P0.

### 2. Decision reasons are first-class data

Design:

- Permission outcomes carry structured reasons, not just booleans.

Problem solved:

- Makes debugging and auditing much easier.
- Lets UI or gateway explain why something was blocked.

Openclaw implication:

- Every denial or prompt-worthy action should return a typed reason.

Priority:

- P0.

### 3. Tool matching is smarter than plain string equality

Design:

- Rules can target tools, MCP server namespaces, and agent types.

Problem solved:

- Allows policy to be expressed at the right granularity.

Openclaw implication:

- If `openclaw` exposes MCP-style or plugin tools, permissions should understand namespaces rather than only exact names.

Priority:

- P1, but the design direction is important now.

### 4. Bash-like tools get extra scrutiny

Design:

- Multi-part shell commands are treated differently.
- Display messages can strip redirections for clearer approval prompts.

Problem solved:

- Shell tools are high-risk and easy to misread.

Openclaw implication:

- Shell and filesystem mutation tools should be a separate permission category from read-only retrieval tools.

Priority:

- P0.

### 5. Permission is not just policy, it is user communication

Design:

- `createPermissionRequestMessage` is part of the core flow.

Problem solved:

- Users can understand what is being requested and why.

Openclaw implication:

- Good permission systems need explanation text, not only enforcement.

Priority:

- P0.

### 6. Denial tracking acknowledges repeated pressure on the policy boundary

Design:

- The module tracks denials and can adjust behavior when repeated refusal patterns appear.

Problem solved:

- Prevents systems from getting stuck in repeated low-value approval loops.

Openclaw implication:

- Even a simple denial counter could improve UX and safety.

Priority:

- Research first, then a lightweight version.

### 7. Hooks and classifiers extend policy beyond static rules

Design:

- The permission system can consult hooks and classifier-style logic.

Problem solved:

- Some risky actions are context-sensitive and not captured by static rules alone.

Openclaw implication:

- This is powerful, but it is also where complexity rises sharply.

Priority:

- Research only for now.

## What Looks Worth Copying

The most transferable permission ideas are:

1. layered permission sources
2. typed decision reasons
3. shell tool special handling
4. human-readable approval messages
5. simple denial tracking

## What Looks Too Heavy For P0

These should not be part of the first `openclaw` enhancement slice:

1. classifier-driven permission automation
2. dense hook ecosystem
3. fully generalized MCP namespace policy grammar
4. complex auto-mode logic

## Openclaw P0 Recommendation

P0 should likely include:

1. allow / ask / deny outcomes
2. explicit decision reasons
3. operator-config + session-level precedence
4. separate policy for shell vs non-shell tools
5. clear permission request text

## Open Questions

1. What is the current permission surface of `openclaw` today?
2. Does `openclaw-gateway` need to make permission decisions itself, or only surface them from a runtime plugin?
3. Should shell approval happen per tool, per command prefix, or per concrete invocation?
