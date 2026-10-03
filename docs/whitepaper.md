# Hunt whitepaper (draft)

## 1. The idea

Most questions that matter have a plain answer in the end: a vote is won or lost, a match is taken or dropped, a price clears a line or it does not. Before the answer arrives, people disagree, and that disagreement carries information. Hunt gives it a home.

A Hunt market starts as one sentence. Two outcome shares exist, Yes and No. Together they are worth one USDC at resolution: the correct side pays out in full, the other pays nothing. Because the pair is bounded by one dollar, the price of a side reads directly as a probability. Sixty cents for Yes is the crowd saying six in ten.

## 2. Why a price beats a poll

A poll costs nothing to answer, so it rewards volume and mood. A price costs money to move, so it rewards being right. People with better information, or a better read of public information, profit by pushing the price toward the truth, and that push is the signal everyone else watches.

## 3. Principles

1. **Clear questions.** A market must resolve to Yes or No with no judgement call left to the reader. Vague wording is rejected before launch.
2. **Visible odds.** Every price, volume figure and change is on screen, not behind a click.
3. **Your funds stay yours.** Positions are held on Robinhood Chain; the front end never takes custody.
4. **Honest status.** Anything unannounced, from a contract address to a social account, is labelled as such.

## 4. Lifecycle of a market

1. A question is proposed with a resolution rule and a deadline.
2. Liquidity opens and both sides trade against USDC.
3. Prices move as events unfold.
4. At the deadline the rule is applied and the winning side redeems at one USDC.

The exact resolution mechanism, fee schedule and dispute path are open design items and will be fixed in a later revision of this document before launch.

## 5. Risks

Markets can be thin, rules can be misread, and a resolved loss is a total loss on that position. Nothing here is advice.
