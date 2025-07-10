interface InterfaceState {
  okButtonActive: boolean;
  whatever: number;
}

export function getInitialState(): InterfaceState {
  return {
    okButtonActive: true,
    whatever: 42,
  };
}

export function getForeachList() {
  return [
    { id: 1, value: 'abc' },
    { id: 45, value: 'oweiru' },
    { id: 34, value: 'elrj' },
  ];
}
