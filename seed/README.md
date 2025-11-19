# Seed Data Documentation

## Quick Start

### Run Complete Seed (Recommended)
```bash
cd seed
source ./get-table-names.sh
export ATHLETE_EVENTS_TABLE='Athleon-development-AthletesAthleteEventsTable1485A78C-1OEXNG2ZVE6VM'
AWS_PROFILE=labvel-dev node seed-all-clean.js
```

This single command seeds everything in the correct order:
1. Authorization system (roles & permissions)
2. Admin users (super admin + organizers)
3. Athletes (20 test users)

**Idempotent**: Safe to run multiple times.

## Overview
This directory contains scripts to populate the Athleon platform with initial test data.

## Athletes (20 Total)

### Men (10 Athletes)
Distributed across categories:
- **Elite** (3): John Doe, Chris Brown, Kevin Davis
- **Professional** (2): Mike Smith, James Miller
- **Advanced** (3): Alex Johnson, Ryan Garcia, Brandon Lopez
- **Intermediate** (2): David Wilson, Tyler Martinez

| Email | Name | Alias | Age | Country | Category |
|-------|------|-------|-----|---------|----------|
| john.doe@test.com | John Doe | JDoe | 28 | USA | men-elite |
| mike.smith@test.com | Mike Smith | MikeS | 32 | Canada | men-professional |
| alex.johnson@test.com | Alex Johnson | AJ | 26 | UK | men-advanced |
| chris.brown@test.com | Chris Brown | CBrown | 30 | Australia | men-elite |
| david.wilson@test.com | David Wilson | DWilson | 24 | USA | men-intermediate |
| ryan.garcia@test.com | Ryan Garcia | RGarcia | 27 | Spain | men-advanced |
| james.miller@test.com | James Miller | JMiller | 31 | Germany | men-professional |
| kevin.davis@test.com | Kevin Davis | KDavis | 29 | France | men-elite |
| tyler.martinez@test.com | Tyler Martinez | TMartinez | 23 | Mexico | men-intermediate |
| brandon.lopez@test.com | Brandon Lopez | BLopez | 25 | Brazil | men-advanced |

### Women (10 Athletes)
Distributed across categories:
- **Elite** (3): Sarah Jones, Sophia Anderson, Amelia Harris
- **Professional** (2): Emma Williams, Charlotte White
- **Advanced** (3): Olivia Taylor, Mia Jackson, Evelyn Garcia
- **Intermediate** (2): Isabella Thomas, Harper Martin

| Email | Name | Alias | Age | Country | Category |
|-------|------|-------|-----|---------|----------|
| sarah.jones@test.com | Sarah Jones | SJones | 27 | USA | women-elite |
| emma.williams@test.com | Emma Williams | EmmaW | 30 | Canada | women-professional |
| olivia.taylor@test.com | Olivia Taylor | OTaylor | 25 | UK | women-advanced |
| sophia.anderson@test.com | Sophia Anderson | SophiaA | 28 | Australia | women-elite |
| isabella.thomas@test.com | Isabella Thomas | IsabellaT | 22 | USA | women-intermediate |
| mia.jackson@test.com | Mia Jackson | MiaJ | 26 | Spain | women-advanced |
| charlotte.white@test.com | Charlotte White | CharlotteW | 31 | Germany | women-professional |
| amelia.harris@test.com | Amelia Harris | AmeliaH | 29 | France | women-elite |
| harper.martin@test.com | Harper Martin | HarperM | 23 | Mexico | women-intermediate |
| evelyn.garcia@test.com | Evelyn Garcia | EvelynG | 24 | Brazil | women-advanced |

**Password for all athletes**: `Athlete123!`

## Categories (8 Global Categories)

### Men's Categories
- **men-intermediate**: Intermediate level male athletes (18+)
- **men-advanced**: Advanced level male athletes (18+)
- **men-professional**: Professional level male athletes (18+)
- **men-elite**: Elite level male athletes (18+)

### Women's Categories
- **women-intermediate**: Intermediate level female athletes (18+)
- **women-advanced**: Advanced level female athletes (18+)
- **women-professional**: Professional level female athletes (18+)
- **women-elite**: Elite level female athletes (18+)

All categories are global (`eventId: 'global'`) and available across all events.

## WODs (2 Template WODs)

### 1. Baseline AMRAP
- **Format**: AMRAP
- **Time Limit**: 10 minutes
- **Category**: men-elite
- **Movements**:
  - 10 Pull-ups
  - 20 Push-ups
  - 30 Air Squats
- **Description**: Complete as many rounds as possible in 10 minutes

### 2. The Gauntlet
- **Format**: Chipper
- **Time Limit**: 20 minutes
- **Category**: men-elite
- **Movements**:
  - 50 Burpees
  - 40 Pull-ups
  - 30 Push-ups
  - 20 Sit-ups
  - 10 Squats
- **Description**: Complete all movements for time

## Exercises (21 Global Exercises)

### Strength (8)
- Muscle Up (Bodyweight) - 5 pts
- Muscle Up (Weighted) - 5 pts + weight bonus
- Pull Up (Bodyweight) - 1 pt
- Pull Up (Weighted) - 1 pt + weight bonus
- Bar Dips (Bodyweight) - 1 pt
- Bar Dips (Weighted) - 1 pt + weight bonus
- Squats (Weighted) - 0.5 pt + weight bonus
- Pistol Squats (Weighted) - 1.5 pts + weight bonus

### Endurance (6)
- Push Ups (Bodyweight) - 0.5 pt
- Push Ups (Deadstop) - 0.5 pt + deadstop bonus
- Squats (Bodyweight) - 0.5 pt
- Burpees - 1 pt
- Zancadas Burpees - 2 pts
- Chin Over Bar Hold - 2 pts per 10s

### Skill (7)
- Pistol Squats (Bodyweight) - 1.5 pts
- Handstand Hold - 2 pts per 10s
- Handstand Push Up - 4 pts
- Front Lever Hold - 3 pts per 10s
- One Arm Pull Up - 8 pts
- Leg Raiser Muscle Up - 6 pts
- L-Sit Hold - 2 pts per 10s

## Running Seed Scripts

### Seed All Data
```bash
cd seed
./seed-all.sh
```

### Seed Individual Components
```bash
# Categories and WODs
AWS_PROFILE=labvel-dev node seed-categories.js

# Exercises
AWS_PROFILE=labvel-dev node seed-exercises.js

# Athletes (requires table names)
export ATHLETES_TABLE=<table-name>
export ATHLETE_EVENTS_TABLE=<table-name>
export EVENTS_TABLE=<table-name>
export USER_POOL_ID=<pool-id>
AWS_PROFILE=labvel-dev node seed-20-athletes.js
```

### Get Table Names
```bash
bash get-table-names.sh
```

## Notes

- All athletes are automatically registered for the "Demo Competition 2025" event
- Athletes are distributed across different skill levels for realistic testing
- All seed data uses `eventId: 'global'` or `eventId: 'template'` for platform-wide availability
- Password for all test accounts: `Athlete123!`
