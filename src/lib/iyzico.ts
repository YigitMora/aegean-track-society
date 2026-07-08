import Iyzipay from "iyzipay";
import { Prisma } from "@prisma/client";

export type IyzicoInitializeInput = {
  conversationId: string;
  basketId: string;
  amount: Prisma.Decimal;
  currency: string;
  buyer: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    ipAddress: string | null;
  };
  basketItem: {
    id: string;
    name: string;
  };
};

export type IyzicoCheckoutResponse = Record<string, unknown> & {
  status?: string;
  token?: string;
  paymentPageUrl?: string;
  conversationId?: string;
  paymentStatus?: string;
  paymentId?: string;
  price?: string | number;
  paidPrice?: string | number;
  currency?: string;
  basketId?: string;
};

let iyzipayClient: Iyzipay | null = null;

export async function initializeCheckoutForm(input: IyzicoInitializeInput) {
  const client = getIyzicoClient();
  const amount = formatDecimal(input.amount);
  const [name, surname] = splitFullName(input.buyer.fullName);
  const callbackUrl = new URL(
    "/api/payments/iyzico/callback",
    getRequiredEnv("NEXT_PUBLIC_APP_URL"),
  ).toString();

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId: input.conversationId,
    price: amount,
    paidPrice: amount,
    currency: input.currency,
    basketId: input.basketId,
    paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
    callbackUrl,
    enabledInstallments: [1],
    buyer: {
      id: input.buyer.id,
      name,
      surname,
      gsmNumber: input.buyer.phone,
      email: input.buyer.email,
      identityNumber: "11111111111",
      registrationAddress: "Kula MyTrack, Manisa",
      ip: input.buyer.ipAddress ?? "127.0.0.1",
      city: "Manisa",
      country: "Turkey",
      zipCode: "45170",
    },
    billingAddress: {
      contactName: input.buyer.fullName,
      city: "Manisa",
      country: "Turkey",
      address: "Kula MyTrack, Manisa",
      zipCode: "45170",
    },
    shippingAddress: {
      contactName: input.buyer.fullName,
      city: "Manisa",
      country: "Turkey",
      address: "Kula MyTrack, Manisa",
      zipCode: "45170",
    },
    basketItems: [
      {
        id: input.basketItem.id,
        name: input.basketItem.name,
        category1: "Motorsport",
        category2: "Track Day",
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: amount,
      },
    ],
  };

  return callIyzico<IyzicoCheckoutResponse>((callback) => {
    client.checkoutFormInitialize.create(request, callback);
  });
}

export async function retrieveCheckoutForm(input: {
  token: string;
  conversationId: string;
}) {
  const client = getIyzicoClient();

  return callIyzico<IyzicoCheckoutResponse>((callback) => {
    client.checkoutForm.retrieve(
      {
        locale: Iyzipay.LOCALE.TR,
        conversationId: input.conversationId,
        token: input.token,
      },
      callback,
    );
  });
}

export function formatDecimal(decimal: Prisma.Decimal) {
  return decimal.toFixed(2);
}

function getIyzicoClient() {
  if (!iyzipayClient) {
    iyzipayClient = new Iyzipay({
      apiKey: getRequiredEnv("IYZICO_API_KEY"),
      secretKey: getRequiredEnv("IYZICO_SECRET_KEY"),
      uri: getRequiredEnv("IYZICO_BASE_URL"),
    });
  }

  return iyzipayClient;
}

function callIyzico<T>(
  fn: (callback: (error: unknown, result: T) => void) => void,
) {
  return new Promise<T>((resolve, reject) => {
    fn((error, result) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(result);
    });
  });
}

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not configured.`);
  }

  return value;
}

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const name = parts[0] || "Aegean";
  const surname = parts.slice(1).join(" ") || "Driver";

  return [name, surname];
}
