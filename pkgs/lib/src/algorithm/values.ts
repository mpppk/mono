// eslint-disable-next-line @typescript-eslint/ban-types
export interface NodeID extends Number {
  _nodeIDBrand: never;
}
export const NodeID = Object.freeze({
  new: (n: number): NodeID => n as unknown as NodeID,
  fromArray: (n: number[]): NodeID[] => n.map((v) => NodeID.new(v)),
  toNumber: (id: NodeID): number => id as unknown as number,
});

// eslint-disable-next-line @typescript-eslint/ban-types
export interface DagID extends Number {
  _nodeIDBrand: never;
}
export const DagID = Object.freeze({
  new: (n: number): DagID => n as unknown as DagID,
  toNumber: (id: DagID): number => id as unknown as number,
});
