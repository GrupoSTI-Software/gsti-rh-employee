# Project: Customer Portal

## Tech Stack
- Angular 21
- NgRx Signals for state management
- Angular Material with custom theme
- Jest for testing

## Conventions
- All components use OnPush change detection
- Feature modules organized by domain (users, orders, products)
- API calls go through services, never directly in components

## Commands
- `npm run test` - Run unit tests
- `npm run e2e` - Run Playwright tests
- `npm run lint` - Check code style
