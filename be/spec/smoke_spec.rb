# frozen_string_literal: true

require "rails_helper"

RSpec.describe("Smoke test") do
  it "boots the Rails app" do
    expect(Rails.application).to(be_a(Rails::Application))
  end

  it "runs in the test environment" do
    expect(Rails.env).to(eq("test"))
  end
end
