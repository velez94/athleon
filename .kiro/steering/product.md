# Athleon Platform

Multi-tenant calisthenics competition management platform supporting organizations, organizers, and athletes.

## Core Features

- **Organization Management**: Multi-tenant RBAC system with owner/admin/member roles
- **Event Management**: Create, publish, and manage competitions with categories, WODs, and scoring
- **Athlete Portal**: Browse events, register, submit scores, view leaderboards
- **Advanced Scoring**: Multiple scoring systems (classic, EDS×EQS) with real-time leaderboard calculation
- **Competition Scheduling**: Tournament support with heat generation and session management

## User Roles

- **Super Admin** (admin@athleon.fitness): Full system access, bypass organization checks
- **Organization Owner**: Full organization control, manage members and events
- **Organization Admin**: Manage members and events
- **Organization Member**: Create and edit events
- **Athletes**: Register for events, submit scores, view leaderboards

## Key Concepts

- **Organizations**: Teams/groups that own and manage events
- **Events**: Competitions with categories, WODs, and schedules
- **WODs**: Workouts/challenges within events
- **Categories**: Competition divisions (age/gender-based)
- **Scores**: Athlete performance submissions with judge validation
- **Leaderboards**: Real-time rankings by category and event

## Platform Status

~98% complete with production-ready infrastructure, frontend, and backend services.
