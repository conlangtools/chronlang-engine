export type Position = {
  offset: number;
  line: number;
  column: number;
};

export type Span = {
  source: string;
  start: Position;
  end: Position;
};

export type Spanned<T> = readonly [T, Span];
