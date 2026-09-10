# Remix of PrintHub Manager

Create a complete web application called "PrintHub Manager" — a collaborative 3D printing farm operations & quotation platform. 

Database Schema & State Logic to Implement:

1. Printers: `id`, `name`, `model` (e.g., Bambu Lab X1C), `status` (idle, printing, error), `hourly_rate`, `kwh_consumption`.

2. FilamentInventory: `id`, `material`, `brand`, `color_hex`, `spool_weight_g`, `cost_per_kg`, `remaining_g`.

3. Quotes & PrintJobs: `id`, `job_name`, `customer_name`, `filament_id`, `weight_grams`, `print_time_hours`, `setup_fee`, `material_cost`, `energy_cost`, `profit_margin`, `total_price`, `status`, `assigned_printer_id`.

4. PartnerSplits: Track dynamic profit shares across 3 partners (Isaac, Adriano, Partner 3).

Core Interactive Features:

- Interactive Cost Estimator:

  * Formula: 

    - Material Cost = (Weight_g / 1000) * Filament Cost/kg

    - Energy Cost = Print_time_hours * (Printer_Watts / 1000) * kWh_price

    - Total Cost = Material + Energy + Setup/Labor

    - Final Price = Total Cost * (1 + Profit_Margin_Percentage)

  * Real-time calculation reacting to slider adjustments (Profit margin 10% to 200%).

  * One-click "Create Job & Add to Queue" button.

- Production Queue & Machine Assignment:

  * Drag-and-drop or select menu to assign jobs directly to available Bambu Lab or secondary printers.

  * Status updater that deducts filament from inventory upon marking a job as "Completed".

- Revenue Split Dashboard:

  * Automatically calculates total earnings, raw costs recovery, and net payout per partner.

Tech Stack & UI:

- React + Tailwind CSS + Lucide React + Recharts.

- Sleek modern industrial UI theme (Zinc/Slate palette with vivid status accents: Emerald, Amber, Cyan).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/99c98f47-60b1-4290-b7ab-cce240fa7501).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
