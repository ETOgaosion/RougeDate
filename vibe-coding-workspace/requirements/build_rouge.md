# Requirement 1: Build Rouge Page

PRE-REQUEST: Read [base.md](../knowlegde/base.md)

CONTEXT: As a universal framework, we need to seperate the date logics and the frameworks. We need to create a json format date arrangement file reading mechanism. You need to use React + Tailwind CSS to build.

MATERIALS: Look at 
- [example_cards.png](./imgs/example_cards.png) 
- [example_cards_details.png](./imgs/example_cards_details.png)

TASK: you should create a main page
- I have write my plans in [time_1.json](../../date_arrangement/time_1.json), read the format and convert it to rouge page in our frameworks
- After user click the entry page enter, detect which time they clicked and open time_x.json accordingly to handle, there should be animation connect these:
    - The contents above main background fade
    - the main background become bright
    - use a Cross dissolution effect to switch to the day_x_background
    - display the plan options
- Notice that the frameworks must be universal, so without any hard code
- json structure:
    - days
        - plans
            - columns
                - activities
- You should make every plan activity as a card, you should organize the cards in differnt columns, if 1 column has multiple activities, display them in order
- There are multiple days, 1 page dispaly 1 day all plans, day x use background [assets\images\day_x_background.png](../../assets/images/day_x_background.png)
- you should connect them use the `connect_from` attribute, draw a curve to connect them
- For cards, fill with differnt colors and display ak_tags attribute value in it
- User can click on the cards, after they click, the detailed page display from right side like [example_cards_details.png](./imgs/example_cards_details.png)
- There is a button with text "前往出发" shown in the card detailed page
    - After user click it, current card is chosen and other cards in the same column cannot be chosen, turn grey. While cards in the next column that this card can connect to show up
- In the top, there should be a top bar
    - You should display the `游客: {User}` in the left of the top bar
    - You should display the debuff attribute in the center of the top bar
- Always remember to refer to [example_cards.png](./imgs/example_cards.png) and [example_cards_details.png](./imgs/example_cards_details.png) for format