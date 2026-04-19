migrate(
  (app) => {
    // Default suggestions are now handled directly in the frontend components
    // (SuppliesTab.tsx and CostsTab.tsx) to provide better i18n and dynamic updates.
    // No database schema changes are required for this update.
  },
  (app) => {
    // Revert is a no-op
  },
)
