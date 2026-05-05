# typed: true

module Rack
  class Cors
    def initialize(app, opts = T.unsafe(nil), &block); end
    def call(env); end
    def allow(&block); end
  end
end
