import grpc from 'grpc';

export class GrpcServiceClient {
  private readonly client: grpc.Client;

  constructor(client: grpc.Client) {
    this.client = client;
  }

  protected unary<Req, Res>(rpcName: string, req: Req): Promise<Res> {
    return new Promise<Res>((resolve, reject) => {
      this.client[rpcName](req, (err, res) => {
        err ? reject(err) : resolve(res);
      });
    });
  }
}

function get(obj: any, key: string) {
  if (!obj) {
    return undefined;
  }

  for (let k of key.split('.')) {
    if (!obj[k]) {
      return undefined;
    }
    obj = obj[k];
  }

  return obj;
}

export class GrpcContainer {
  private readonly packageDefinition: grpc.PackageDefinition;

  constructor(packageDefinition: grpc.PackageDefinition) {
    this.packageDefinition = packageDefinition;
  }

  connect(uri: string, serviceName: string): Promise<grpc.Client> {
    const root = grpc.loadPackageDefinition(this.packageDefinition);

    const ServiceClient = get(root, serviceName) as typeof grpc.Client;
    if (!ServiceClient) {
      throw new Error(`Could not find a service named ${serviceName}.`);
    }

    const client = new ServiceClient(uri, grpc.credentials.createInsecure());

    return new Promise((resolve, reject) => {
      grpc.waitForClientReady(client, Number.POSITIVE_INFINITY, err => {
        err ? reject(err) : resolve(client);
      });
    });
  }
}
