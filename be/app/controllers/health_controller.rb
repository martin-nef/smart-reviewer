class HealthController < ApplicationController
  def show
    ok =
      begin
        Mongoid.default_client.database.command(ping: 1)
        true
      rescue StandardError
        false
      end
    render json: { status: ok ? "ok" : "degraded", mongo: ok }, status: ok ? :ok : :service_unavailable
  end
end
