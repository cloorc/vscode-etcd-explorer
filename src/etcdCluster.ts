import * as vscode from 'vscode';
import * as path from 'path';

const Etcd2 = require('node-etcd');

export class EtcdCluster {
  protected etcd_host: string;
  protected client: any;
  protected members: Array<EtcdClusterMember>;
  private updatingMembers: boolean;
  private refreshMembers: boolean;

  constructor() {
    console.log("Constructing ETCD Cluster Info");
    this.etcd_host = "";
    this.updatingMembers = false;
    this.refreshMembers = true;
    this.members = new Array<EtcdClusterMember>();
    this.initClient();
  }

  getTreeItem(element: EtcdClusterMember): vscode.TreeItem {
    return element;
  }

  getChildren(element?: EtcdClusterMember): Thenable<EtcdClusterMember[]> {
    if (this.updatingMembers || this.refreshMembers) {
      return Promise.resolve([new EtcdUpdatingMemberNode()]);
    }
    console.log("getChildren  => " + this.members.length);
    return Promise.resolve(this.members);
  }

  initClient() {
    this.updatingMembers = true;
    var conf = vscode.workspace.getConfiguration('etcd-explorer');
    this.etcd_host = conf.etcd_host;
    var self = this;
    if (!this.etcd_host) {
      self.refresh();
      return;
    }
    this.client = new Etcd2([this.etcd_host]);
    console.log("Self Stats");
    this.client.selfStats(console.log);
    this.client.raw("GET", "v2/members", null, {}, (err: any, val: any) => {
      if (val === undefined) {
        console.log(require('util').inspect(err, true, 10));
        vscode.window.showErrorMessage(err.toString());
        this.updatingMembers = false;
        self.refresh();
        return;
      }
      for (var member of val.members) {
        if (!this.hasMember(member.name))
          this.members.push(new EtcdClusterMember(member.name));
        console.log("Member: " + member.name);
      }
      this.updatingMembers = false;
      this.refreshMembers = false;
      self.refresh();
    });
  }

  hasMember(name: string): boolean {
    for (var member of this.members) {
      if (member.label === name) {
        return true;
      }
    }
    return false;
  }
  private _onDidChangeTreeData: vscode.EventEmitter<EtcdClusterMember | undefined> = new vscode.EventEmitter<EtcdClusterMember | undefined>();
  readonly onDidChangeTreeData: vscode.Event<EtcdClusterMember | undefined> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire(undefined);
  }

  refreshData() {
    // read the configuration again
    this.initClient();
  }


}

export class EtcdClusterMember extends vscode.TreeItem {
  constructor(
    public readonly label: string
  ) {
    super(label, vscode.TreeItemCollapsibleState.None);
  }

  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'light', 'server_connected.svg'),
    dark: path.join(__filename, '..', '..', 'resources', 'dark', 'server_connected.svg')
  };
}

export class EtcdUpdatingMemberNode extends EtcdClusterMember {
  constructor() {
    super("Updating");
  }
  iconPath = {
    light: path.join(__filename, '..', '..', 'resources', 'loading.gif'),
    dark: path.join(__filename, '..', '..', 'resources', 'loading.gif')
  };

}
