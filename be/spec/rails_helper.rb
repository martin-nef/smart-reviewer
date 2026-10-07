# frozen_string_literal: true

require "spec_helper"
ENV["RAILS_ENV"] ||= "test"
require_relative "../config/environment"
abort("The Rails environment is running in production mode!") if Rails.env.production?
require "rspec/rails"
require "rspec/sorbet"

RSpec.configure do |config|
  config.use_transactional_fixtures = false
  config.use_active_record = false
  config.filter_rails_from_backtrace!
  config.include(FactoryBot::Syntax::Methods)

  config.before(:suite) do
    Mongoid.purge!
    Mongoid.models.each(&:create_indexes)
  end

  # truncate! keeps indexes, unlike purge!, so unique indexes stay enforced.
  config.after(:each) do
    Mongoid.truncate!
  end
end
