# Requirement 1: Build Success Page

PRE-REQUEST: Read [base.md](../knowlegde/base.md)

CONTEXT: As a universal framework, we need to seperate the date logics and the frameworks. We need to create a json format date arrangement file reading mechanism. You need to use React + Tailwind CSS to build.

TASK: you should create a main page
- After user click the card with `ak_tag=="出园"`, enter success page, there should be animation connect these:
    - The contents above day_x_background fade
    - use a Cross dissolution effect to switch from the day_x_background to the success_page background
    - display success page
- Notice that the frameworks must be universal, so without any hard code
- You should record the chosen cards of all days
- on the top of success page, you should display text "Dr. {user}"
- In the middle of the page, you should display text "游览者名单" and on next line `mate` attribute of time_x.json
- Below, you should display all cards title of all days
- all text should be displayed in the center horizontally