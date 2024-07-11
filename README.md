## HOOT (Demo Version)
#### A Personal Health Tracker

Give a HOOT about your health!

-----

No license offered. This application is currently for private, personal development only.

-----

[Live Demo](https://hoot.ngrok.dev)

> Note: You will see a warning from `ngrok` asking if you trust the developer of this application.

-----

#### What Does It Do?

HOOT is a symptom- and habit-tracking web app that allows users to fully customize the variables they monitor. It is designed to run on a Raspberry Pi or similar device connected to the user's home internet ensuring that their data is their own.

###### Variables & Categories

Users can create their own categories and define all the variables they want to track. Variables can be:

- **boolean**: yes/no, happened/didn't happen
	- "*I drank coffee*"
	- "*I took a bath*"
	- "*I had diarrhea*"
	- "*I took my allergy meds*"
- **scalar**: intensity, hours, degree, daily count
	- "*I got 7 hours of sleep*"
	- "*I drove for 3 hours today*"
	- "*The high temperature was 82℉*"
	- "*I had a horrible headache*"

Variables can be classified as positive or negative. For example, drinking water might be a positive habit whereas nail biting might be a negative habit. The positive/negative classification is used to make graphic visualizations of the data more meaningful.

When a data point is recorded, the current timestamp is automatically saved. Users can change the timestamp before or after recording the data point.

Each category and variable can have a custom color associated. This color will be used when graphing the data.

###### Shortcuts

Boolean variables can be set as shortcuts. The shortcuts tab is a collection of buttons - one for each variable tagged as a shortcut. This is great for quickly recording frequent medications or commonly consumed food and drink.

###### Daily Forms

Variables can also be added to daily forms. There is one for morning and one for evening. For example, the daily morning form could include sleep variables or basal body temperature (taken upon waking up). For the evening, a user can reflect on there day: *How intense was my anxiety today?* or *How many hours did I spend sitting at at desk?*

###### Visualizations

Bar charts and heatmaps are available in the Charts tab. The bar charts for individual variables take into account whether each variable is positive or negative and graphs the data accordingly. There is also a bar chart where the variables are aggregated into categories rather than being graphed individually; this ignores positive/negative classifications.

The charts are currently split into charts for boolean variables and scalar variables. That means there is a boolean heatmap, a scalar heatmap, a boolean bar chart, a scalar bar chart, and a category bar chart. As of July 2024, I track 90 variables (yes, ninety!) so splitting the charts by type of variable helps keeps the graphs from being too full of data to observe the information in a useful way.

-----

#### Why Build This?

As a person who struggles with chronic health issues, I searched far and wide for a symptom-tracking app that could fully capture my daily experiences -- and could also present the data to myself and healthcare professionals in an effective way.

Additionally, as a lifelong advocate for personal data privacy, I was constantly weighing the benefits of a convenient symptom-tracking app with the drawbacks of having all my personal health data stored in the cloud by a private company.

After years of trying various apps, I found there wasn't anything available with enough of the features I needed to overcome my data privacy concerns. Most apps were too focused on a specific set of health, like period tracking or gastrointestinal symptoms. Some allowed for customization of the variables a user wanted to track, but it was often limited. And finally, very few offered the ability to visualize the user's data, especially on a time scale that allowed for seeing trends over months or years.

In 2020, I began working on a simple Electron app, called HealthGraph, that would allow me to fully customize variables I wanted to track and then graph the data. It was somewhat useful at the time, but the first version(s) ran only on my laptop and it was difficult to track things when I was away from home. (That wasn't a problem during pandemic lockdowns, but became more difficult in later years!)

In 2022, I came across the [Cycles Journal](https://cyclesjournal.com/). While this journal is nominally focused on the female hormone cycle, only 3 of the 30 variables it suggests tracking are directly related to menstruation. In addition to the 30 suggested variables, which include things like headaches, sleep data, and positive habits, it also has 8 blank lines for tracking customized variables.

The journal has daily pages for reflections or comments, but my favorite feature is the pages with an empty bubble for each of the 38 variables across the 28 days of the lunar cycle. Filling in the bubbles with shading, symbols, or dots creates a heatmap-style overview of each month. This visual, along with the ability to flip through this section to compare month-to-month, provided with a simple, quick, and effective way to spot sublte trends in my health.

My second favorite feature is that my data is mine. It stays in this physical book and isn't controlled or accessible by any third parties. This eventually became a downside when I began spending more time away from home, especially when traveling by plane, because I didn't want to bring a large, heavy journal in my suitcase.

Thus, in 2024, I returned to the idea of developing my own customizable health tracking app -- one that I could access from my phone while out and about, but that also wouldn't involve storing my data in the cloud. 

-----
