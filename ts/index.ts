// compatibility
declare global {
  interface Element { }
  interface Node { }
  interface NodeListOf<TNode = Node> { }
}

// normal
export * from './smartpdf.classes.smartpdf';
