declare module "iyzipay" {
  type Callback<T> = (error: unknown, result: T) => void;

  class Iyzipay {
    constructor(config?: {
      apiKey?: string;
      secretKey?: string;
      uri?: string;
    });

    checkoutFormInitialize: {
      create(request: Record<string, unknown>, callback: Callback<Record<string, unknown>>): void;
    };

    checkoutForm: {
      retrieve(request: Record<string, unknown>, callback: Callback<Record<string, unknown>>): void;
    };

    static LOCALE: {
      TR: "tr";
      EN: "en";
    };

    static PAYMENT_GROUP: {
      PRODUCT: "PRODUCT";
      LISTING: "LISTING";
      SUBSCRIPTION: "SUBSCRIPTION";
    };

    static BASKET_ITEM_TYPE: {
      PHYSICAL: "PHYSICAL";
      VIRTUAL: "VIRTUAL";
    };

    static CURRENCY: {
      TRY: "TRY";
      EUR: "EUR";
      USD: "USD";
      GBP: "GBP";
      NOK: "NOK";
      CHF: "CHF";
    };
  }

  export = Iyzipay;
}
