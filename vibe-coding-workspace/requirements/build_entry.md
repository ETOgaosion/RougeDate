# Requirement 1: Build Entry page

PRE-REQUEST: Read [base.md](../knowlegde/base.md)

CONTEXT: As a universal framework, we need to seperate the date logics and the frameworks. We need to create a json format date arrangement file reading mechanism. You need to use React + Tailwind CSS to build.

TASK: First you should create a main page

- Use animation to
  - first display main background image [main_background](../../assets/images/main_background.png)
  - Then make main background image [main_background](../../assets/images/main_background.png) darker
- Then over the background divide the screen into 2 halves:
  - left half smaller: only display text "请君进入"
  - right half larger: display line blocks which can be scrolled, the number of line blocks equal to argmax(x, time_x.json) in [date_arrangement folder](../../date_arrangement/), the number increase from botton to top
    - In the line block x, read time_x.json "city" attribute value and display right of the number x
    - After user scolled to some line blocks, display a right arrow and text "进入"
- Then you should add documents of how to install and view on website.
