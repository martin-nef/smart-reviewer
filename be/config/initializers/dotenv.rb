# frozen_string_literal: true

# Always let .env win over any pre-existing shell variables so that the app
# behaves consistently regardless of what the developer's shell exports.
Dotenv::Rails.overwrite = true
Dotenv::Rails.load
