# typed: true

module OpenAI
  class BaseModel
    def self.inherited(subclass); end
    def self.required(name, type); end
    def self.optional(name, type); end
  end

  class Client
    def initialize(api_key: T.unsafe(nil)); end
    def responses; end
  end
end
