# My Inventory

## Purpose
To structure my inventory, or to take inventory of my things, and to figure out where everything in my kitchen is. I assume I am just super weird so this will be quite fun endeavor to take and make. I intend to stretch this out to an Amazon Alexa skill where I can log Items and then ask Alexa where an Item is. 

## Intended Use Case
Visually checking what I have from anywhere, or asking while I'm in the kitchen what I have. Keeping track of things that have recently run out, and building a list of ingredients based on where the items are in my house. I'll be able to track how much I use and what I use

## Intended Flow
- Static Web Page accessing database through Vercel Website.
- Audio Logging of Items through an Alexa Skill
- Database Logging through a terminal separated by unique cabinet names
- Structure separated like cabinets with Lists of Items, Quantity, Date Bought

## Intended Structure of Items

This will have a database using tables which should both automatically log metadata such as: Timestamps and Category (Dairy, Eggs, Produce, Meat, Canned Foods, Processed Foods, Grains, Carbs). Which will be generated based for every entry, which will ask for Location, Shelf, and other Notes, Food Item. 

The Location will function like a folder alongside the shelves which will also be folder like. The Item's metadata will contain Food Item, Date, Category and additional Notes.

## Main Use Touchpoints
I imagine this will mainly be used through the Alexa skill, where it's easier to put shit away and tell Alexa where you are putting it. The main goal is to reduce the amount that we have to remember. while also keeping track of what we have and what we don't have. A Kitchen is a very personal space, and you develop an intimacy that is unrivaled.

## Backend

Thinking of using Supabase + Vercel + Alexa app.
