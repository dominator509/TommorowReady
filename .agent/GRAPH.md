# Graph
One node is one bounded ExecPlan. One writer. Status derives from the append-only ledger. Commit every milestone and tag every completed node.

GRAPH-TABLE-BEGIN
NODE EP-000 DEPS -
NODE EP-001 DEPS EP-000
NODE EP-002 DEPS EP-001
NODE EP-003 DEPS EP-002
NODE EP-004 DEPS EP-003
NODE EP-005 DEPS EP-004
NODE EP-006 DEPS EP-004
NODE EP-007 DEPS EP-005,EP-006
NODE EP-008 DEPS EP-007
NODE EP-009 DEPS EP-008
NODE EP-010 DEPS EP-009
GRAPH-TABLE-END

Dispatch: `NEXT` lease and run; `RESUME` continue active lease or take over after 90 stale minutes; `BLOCKED` stop; `STALL` record graph defect and block; `ALL_DONE` run ship gate. Rollback never crosses a completed green tag. Agents coordinate only through Git and ledger.
