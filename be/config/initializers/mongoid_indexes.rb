# frozen_string_literal: true

# Mongoid does not create indexes on its own; make sure they exist on boot.
# Failures (e.g. Mongo unreachable, pre-existing duplicates) must not stop the app from starting.
unless Rails.env.test?
  Rails.application.config.after_initialize do
    Rails.application.eager_load! # Mongoid.models only lists loaded models
    Mongoid.models.each(&:create_indexes)
  rescue StandardError => e
    Rails.logger.error("Mongoid create_indexes failed: #{e.class} (#{e.message})")
  end
end
