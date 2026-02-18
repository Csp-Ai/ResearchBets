# CLV Conventions

## Line CLV
`computeLineCLV` returns `closing_line - placed_line` for spread/total markets.

- Positive value means bettor beat the market.
- Negative value means bettor got a worse number than close.
- Moneyline has no line CLV (`null`).

## Price CLV
`computePriceCLV` converts American odds to implied probability and returns:

`implied_prob(closing_price) - implied_prob(placed_price)`

- Positive value means closing probability moved toward the bettor's side.
- Negative value means closing probability moved away from the bettor's side.

This keeps CLV directional and comparable across positive and negative American prices.
