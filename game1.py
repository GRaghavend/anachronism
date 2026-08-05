import time
import turtle
from turtle import Turtle
from random import randint

#WINDOW SET UP
window = turtle.Screen()
window.title("TURTLE RACE")
turtle.bgcolor("forestgreen")
turtle.color("white")
turtle.speed(0)
turtle.penup() # move turtle to different positions
turtle.setpos(-140,210)
turtle.write("TURTLE RACE",font=("Arial",30,'bold'))
turtle.penup()

#DIRT
turtle.setpos(-400,-180)
turtle.color("chocolate")
turtle.begin_fill()
turtle.pendown()
turtle.forward(800)
turtle.right(90)
turtle.forward(300)
turtle.right(90)
turtle.forward(800)
turtle.right(90)
turtle.forward(300)
turtle.end_fill()

#FINISH LINE
stamp_size = 20
square_size = 15
finish_line = 200

turtle.color("black")
turtle.shape("square")
turtle.shapesize(square_size / stamp_size)
turtle.penup()

#FINISH LINES USING FOR LOOPS
for i in range(10):
    turtle.setpos(finish_line, (150-(i*square_size*2)))
    turtle.stamp()

for j in range(10):
    turtle.setpos(finish_line + square_size, ((150-square_size)-(j*square_size*2)))
    turtle.stamp()

# White squares
turtle.color("white")

for i in range(10):
    turtle.setpos(finish_line + square_size, (150 - (i * square_size * 2)))
    turtle.stamp()

for j in range(10):
    turtle.setpos(finish_line, ((150 - square_size) - (j * square_size * 2)))
    turtle.stamp()
    
turtle.hideturtle()

#TURTLE 1
turtle1 = Turtle()
turtle1.speed(0)
turtle1.color('violet') 
turtle1.shape('turtle')
turtle1.penup()
turtle1.goto(-250,100)
turtle1.pendown() # to follow the turtle everywhere

#TURTLE 2
turtle2 = Turtle()
turtle2.speed(0)
turtle2.color('blue') 
turtle2.shape('turtle')
turtle2.penup()
turtle2.goto(-250,60)
turtle2.pendown() # to follow the turtle everywhere
 
#TURTLE 3
turtle3 = Turtle()
turtle3.speed(0)
turtle3.color('lime') 
turtle3.shape('turtle')
turtle3.penup()
turtle3.goto(-250,20)
turtle3.pendown() # to follow the turtle everywhere 

#TURTLE 4
turtle4 = Turtle()
turtle4.speed(0)
turtle4.color('yellow') 
turtle4.shape('turtle')
turtle4.penup()
turtle4.goto(-250,-20)
turtle4.pendown() # to follow the turtle everywhere 

#TURTLE 5
turtle5 = Turtle()
turtle5.speed(0)
turtle5.color('orange') 
turtle5.shape('turtle')
turtle5.penup()
turtle5.goto(-250,-60)
turtle5.pendown() # to follow the turtle everywhere 

#TURTLE 6
turtle6 = Turtle()
turtle6.speed(0)
turtle6.color('red') 
turtle6.shape('turtle')
turtle6.penup()
turtle6.goto(-250,-100)
turtle6.pendown() # to follow the turtle everywhere 

#RACE STARTS

instruction = Turtle()
instruction.hideturtle()
instruction.penup()
instruction.color("white")
instruction.goto(0, 170)

instruction.write(
    "Choose your turtle color now!",
    align="center",
    font=("Arial", 20, "bold")
)

time.sleep(5)

instruction.clear()

instruction.write(
    "GO!",
    align="center",
    font=("Arial", 24, "bold")
)



turtles = [
    turtle1, turtle2, turtle3,
    turtle4, turtle5, turtle6
]

winner = None

while winner is None:
    for t in turtles:
        t.forward(randint(1, 5))

        if t.xcor() >= finish_line:
            winner = t
            break

writer = Turtle()
writer.hideturtle()
writer.penup()
writer.color("white")
writer.goto(0, -220)

writer.write(
    f"{winner.pencolor().capitalize()} Turtle Wins!",
    align="center",
    font=("Arial", 24, "bold")
)

turtle.exitonclick()
turtle.done()
