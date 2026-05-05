# typed: true

module Dotenv
  class << self
    def load(*filenames); end
    def overload(*filenames); end
    def require_keys(*keys); end
  end

  module Rails
    class << self
      def load; end
      def overwrite=(val); end
      def overwrite; end
    end
  end
end
