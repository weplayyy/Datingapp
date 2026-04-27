# Charm Security Spec

## Data Invariants
1. A user cannot vote for themselves in a competition.
2. A competition entry fee must be positive.
3. Users cannot modify their own coin balance directly (handled by backend or strict rules if permitted). *Correction: I'll use backend for coins to be safe.*
4. A vote must belong to a signed-in user and match their UID.

## The Dirty Dozen Payloads
1. `CREATE /users/fake_id { coins: 999999 }` -> Deny (Spoofing)
2. `UPDATE /users/my_id { score: 1000000 }` -> Deny (Score injection)
3. `UPDATE /users/my_id { displayName: 'Hacker', coins: 0 }` -> Deny (Unauthorized field update)
4. `CREATE /competitions/123 { challengerId: 'attacker', opponentId: 'target', entryFee: -100 }` -> Deny (Invalid pool)
5. `CREATE /competitions/123/votes/my_id { votedForId: 'attacker' }` -> Deny (Double voting if handled by path)
6. `LIST /users` query-less -> Deny (Bulk scrap)
7. `GET /users/private_data` by non-owner -> Deny (PII leak)
8. `UPDATE /competitions/id { status: 'ended', winnerId: 'attacker' }` by non-admin -> Deny (State hijacking)

## Test Runner (Logic)
- See `DRAFT_firestore.rules` validation helpers.
