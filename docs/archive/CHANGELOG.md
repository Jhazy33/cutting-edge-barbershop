# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CHANGELOG.md following Keep a Changelog standard
- Git repository initialization with main branch
- Public folder with logo.png asset for production deployment

### Changed
- Updated constants.ts to use local "/logo.png" instead of external imgur URL
- Rebuilt and deployed website with fixed image assets
- Restored website functionality from previous deployment

### Fixed
- Fixed missing logo image in header/branding by copying to public folder
- Fixed website loading issues by deploying from correct source directory
- Fixed asset path references for production builds

## [0.1.0] - 2026-02-04

### Added
- Initial Cutting Edge Barbershop website deployment
- Service menu with 8 service items (haircuts, beard trims, hot towel shave)
- Gallery section with 4 portfolio images
- Responsive design with Tailwind CSS 4.1
- React 18 + TypeScript + Vite build system
- SEO optimization with meta tags and JSON-LD schema
- Social media integration (Instagram, Facebook, Squire booking)
- Contact information and business hours
- Google Maps integration for location

### Deployment
- Production URL: https://cuttingedge.cihconsultingllc.com/
- VPS: 109.199.118.38 (Contabo)
- Docker container: cutting-edge_barber-shop_1
- nginx reverse proxy routing
