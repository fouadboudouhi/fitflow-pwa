from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import math

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'assets' / 'exercises'
ICON_OUT = ROOT / 'assets' / 'icons'
OUT.mkdir(parents=True, exist_ok=True)
ICON_OUT.mkdir(parents=True, exist_ok=True)

W,H=640,360
BG=(245,245,245)
INK=(17,17,17)
MID=(112,112,114)
LIGHT=(202,202,203)
ACC=(0,125,72)

try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 20)
except:
    font = ImageFont.load_default()

def interp(a,b,t):
    return a+(b-a)*t

def pt(a,b,t): return (interp(a[0],b[0],t), interp(a[1],b[1],t))

def circle(d, p, r=7, fill=INK):
    x,y=p; d.ellipse((x-r,y-r,x+r,y+r), fill=fill)

def line(d,a,b,w=8,fill=INK): d.line((a,b), fill=fill, width=w)

def person(draw, head, shoulder, hip, knee, ankle, elbow=None, hand=None, elbow2=None, hand2=None):
    circle(draw, head, 13)
    line(draw, shoulder, hip, 10)
    line(draw, hip, knee, 9); line(draw, knee, ankle, 9)
    # second leg, slight offset
    line(draw, (hip[0]+8,hip[1]), (knee[0]+22,knee[1]), 7, MID); line(draw,(knee[0]+22,knee[1]),(ankle[0]+28,ankle[1]),7,MID)
    if elbow and hand:
        line(draw, shoulder, elbow, 8); line(draw, elbow, hand, 8)
    if elbow2 and hand2:
        line(draw, (shoulder[0]+4,shoulder[1]+2), elbow2, 7, MID); line(draw, elbow2, hand2, 7, MID)

def base(title=None):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    d.ellipse((155,294,505,336), fill=(233,233,233))
    d.rounded_rectangle((18,18,W-18,H-18), radius=28, outline=(229,229,229), width=2)
    d.rounded_rectangle((38,34,84,40), radius=3, fill=ACC)
    return im,d

def ease(t):
    """Smooth acceleration and deceleration for a controlled rep."""
    return 0.5 - 0.5 * math.cos(math.pi * t)

def save(name, framefn):
    frames=[]
    phases=[0,.125,.25,.375,.5,.625,.75,.875,1,.875,.75,.625,.5,.375,.25,.125]
    durations=[105 if t in (0,1) else 55 for t in phases]
    for t in phases:
        im,d=base()
        framefn(d,ease(t))
        # A compact phase indicator makes the direction of the rep easy to read.
        d.rounded_rectangle((42,H-42,154,H-35), radius=4, fill=(218,218,218))
        d.rounded_rectangle((42,H-42,42+int(112*t),H-35), radius=4, fill=ACC)
        frames.append(im.convert('P', palette=Image.Palette.ADAPTIVE, colors=96))
    frames[0].save(
        OUT/f'{name}.gif',
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
        disposal=2,
    )

# 1 chest press
def chest_press(d,t,incline=False):
    # machine + seat/back
    if incline:
        d.line((190,300,250,145), fill=LIGHT, width=18)
        sh=(258,170); hip=(225,260); head=(275,125)
    else:
        d.line((210,300,210,150), fill=LIGHT, width=18)
        sh=(235,175); hip=(225,265); head=(235,130)
    # seat
    d.line((175,275,265,275), fill=LIGHT, width=18)
    # press arms
    y=178 if not incline else 162
    hx=interp(300,455,t)
    d.line((470,90,470,285), fill=LIGHT, width=12)
    d.line((430,115,430,245), fill=LIGHT, width=8)
    # body
    knee=(280,290); ankle=(330,315)
    elbow=pt((270,y),(355,y),t); hand=(hx,y)
    elbow2=pt((268,y+20),(350,y+20),t); hand2=(hx,y+20)
    person(d,head,sh,hip,knee,ankle,elbow,hand,elbow2,hand2)
    # handles
    line(d,(hx,y-13),(hx,y+13),5,MID)

def pushdown(d,t):
    d.line((485,45,485,310),fill=LIGHT,width=12); d.line((450,50,520,50),fill=LIGHT,width=8)
    sh=(285,145); hip=(285,240); head=(285,105); knee=(300,285); ankle=(300,325)
    elbow=(310,175); hand=(310,interp(205,275,t))
    elbow2=(260,175); hand2=(260,interp(205,275,t))
    person(d,head,sh,hip,knee,ankle,elbow,hand,elbow2,hand2)
    # rope/cable
    d.line((485,55,335,155,310,190),fill=MID,width=4)
    d.line((310,190,hand[0],hand[1]),fill=MID,width=4)

def external_rotation(d,t):
    # cable left, person front/side
    d.line((100,70,100,305),fill=LIGHT,width=12)
    sh=(325,145); hip=(325,245); head=(325,105); knee=(330,285); ankle=(330,325)
    elbow=(345,185)
    # forearm rotates from across belly to outward
    a=-155+95*t; r=70
    hand=(elbow[0]+r*math.cos(math.radians(a)), elbow[1]+r*math.sin(math.radians(a)))
    person(d,head,sh,hip,knee,ankle,elbow,hand)
    d.line((100,155,hand[0],hand[1]),fill=MID,width=4)

def scaption(d,t):
    sh=(320,150); hip=(320,245); head=(320,108); knee=(325,287); ankle=(325,327)
    # arms from down to 30deg forward/up in frontal projection
    e1=pt((300,200),(250,145),t); h1=pt((295,250),(205,95),t)
    e2=pt((340,200),(390,145),t); h2=pt((345,250),(435,95),t)
    person(d,head,sh,hip,knee,ankle,e1,h1,e2,h2)
    circle(d,h1,9,MID); circle(d,h2,9,MID)

def latpulldown(d,t):
    d.line((110,40,110,320),fill=LIGHT,width=12); d.line((110,55,510,55),fill=LIGHT,width=10)
    ybar=interp(90,155,t)
    d.line((225,ybar,415,ybar),fill=INK,width=8)
    sh=(320,170); hip=(320,260); head=(320,130); knee=(295,300); ankle=(275,330)
    e1=pt((260,125),(270,175),t); h1=(250,ybar)
    e2=pt((380,125),(370,175),t); h2=(390,ybar)
    person(d,head,sh,hip,knee,ankle,e1,h1,e2,h2)
    d.line((320,55,320,ybar),fill=MID,width=4)

def cable_row(d,t, high=False):
    d.line((90,70,90,305),fill=LIGHT,width=12)
    d.line((160,290,400,290),fill=LIGHT,width=14)
    sh=(350,160); hip=(340,250); head=(350,120); knee=(270,270); ankle=(200,295)
    if high:
        start=(180,115); end=(315,145)
    else:
        start=(180,180); end=(310,190)
    hand=pt(start,end,t); elbow=pt((260,start[1]),(330,end[1]),t)
    hand2=(hand[0],hand[1]+22); elbow2=(elbow[0],elbow[1]+22)
    person(d,head,sh,hip,knee,ankle,elbow,hand,elbow2,hand2)
    d.line((90,145 if high else 190, hand[0],hand[1]),fill=MID,width=4)

def curl(d,t,hammer=False):
    sh=(320,145); hip=(320,245); head=(320,105); knee=(325,285); ankle=(325,325)
    e1=(290,185); e2=(350,185)
    # hand moves from down to up
    h1=pt((285,260),(260,155),t); h2=pt((355,260),(380,155),t)
    person(d,head,sh,hip,knee,ankle,e1,h1,e2,h2)
    if hammer:
        circle(d,h1,10,MID); circle(d,h2,10,MID)
    else:
        d.line((h1[0]-14,h1[1],h2[0]+14,h2[1]),fill=MID,width=7)
        # EZ bend hint
        d.line((h1[0]-8,h1[1]-5,h1[0]+10,h1[1]+5),fill=INK,width=3)
        d.line((h2[0]-10,h2[1]+5,h2[0]+8,h2[1]-5),fill=INK,width=3)

def squat(d,t):
    # standing to squat
    head=pt((320,85),(320,150),t); sh=pt((320,125),(320,190),t); hip=pt((320,225),(300,255),t)
    knee=pt((320,280),(375,285),t); ankle=(335,325)
    elbow=(270,140+50*t); hand=(235,145+48*t); elbow2=(370,140+50*t); hand2=(405,145+48*t)
    person(d,head,sh,hip,knee,ankle,elbow,hand,elbow2,hand2)
    d.line((220,140+48*t,420,140+48*t),fill=MID,width=8)

def rdl(d,t):
    # hinge down
    head=pt((320,80),(405,160),t); sh=pt((320,125),(390,190),t); hip=pt((320,225),(300,225),t)
    knee=(320,280); ankle=(325,325)
    hand1=pt((285,245),(365,275),t); hand2=pt((355,245),(435,275),t)
    e1=pt((300,185),(370,230),t); e2=pt((340,185),(410,230),t)
    person(d,head,sh,hip,knee,ankle,e1,hand1,e2,hand2)
    d.line((hand1[0]-20,hand1[1],hand2[0]+20,hand2[1]),fill=MID,width=8)

def leg_curl(d,t):
    # lying leg curl
    d.line((150,210,450,210),fill=LIGHT,width=18); d.line((180,210,160,315),fill=LIGHT,width=12); d.line((420,210,440,315),fill=LIGHT,width=12)
    head=(190,175); sh=(235,195); hip=(335,205); knee=(405,215)
    ankle=pt((485,225),(430,145),t)
    circle(d,head,13); line(d,sh,hip,10); line(d,hip,knee,9); line(d,knee,ankle,9)
    d.rounded_rectangle((ankle[0]-18,ankle[1]-8,ankle[0]+18,ankle[1]+8),radius=6,fill=MID)

def leg_extension(d,t):
    d.line((245,145,245,275),fill=LIGHT,width=18); d.line((220,275,390,275),fill=LIGHT,width=18)
    head=(285,105); sh=(285,145); hip=(285,235); knee=(370,255)
    ankle=pt((390,320),(490,255),t)
    person(d,head,sh,hip,knee,ankle)
    d.rounded_rectangle((ankle[0]-8,ankle[1]-18,ankle[0]+8,ankle[1]+18),radius=6,fill=MID)

def calf_raise(d,t):
    sh=(320,140); hip=(320,240); head=(320,100); knee=(320,280); ankle=(320,interp(325,310,t))
    person(d,head,sh,hip,knee,ankle)
    # platform + heel indication
    d.line((250,330,390,330),fill=LIGHT,width=12)
    # shoulders pad
    d.line((275,130,365,130),fill=MID,width=10)

def leg_raise(d,t):
    # lying leg raise to protect shoulder
    d.line((120,280,500,280),fill=LIGHT,width=12)
    head=(175,245); sh=(220,265); hip=(300,272)
    circle(d,head,13); line(d,sh,hip,10)
    # arms beside body
    line(d,sh,(260,290),6,MID)
    # legs pivot from hip
    ang=math.radians(interp(5,-65,t))
    knee=(300+95*math.cos(ang),272+95*math.sin(ang))
    ankle=(300+185*math.cos(ang),272+185*math.sin(ang))
    line(d,hip,knee,9); line(d,knee,ankle,9)
    line(d,(hip[0]+7,hip[1]),(knee[0]+7,knee[1]+4),7,MID); line(d,(knee[0]+7,knee[1]+4),(ankle[0]+7,ankle[1]+5),7,MID)

save('chest-press', lambda d,t: chest_press(d,t,False))
save('incline-chest-press', lambda d,t: chest_press(d,t,True))
save('triceps-pushdown', pushdown)
save('cable-external-rotation', external_rotation)
save('scaption-raise', scaption)
save('lat-pulldown-neutral', latpulldown)
save('seated-cable-row', lambda d,t: cable_row(d,t,False))
save('high-row-machine', lambda d,t: cable_row(d,t,True))
save('ez-bar-curl', lambda d,t: curl(d,t,False))
save('hammer-curl', lambda d,t: curl(d,t,True))
save('squat', squat)
save('romanian-deadlift', rdl)
save('leg-curl', leg_curl)
save('leg-extension', leg_extension)
save('calf-raise', calf_raise)
save('leg-raise', leg_raise)

# icons
for size in (192,512):
    im=Image.new('RGB',(size,size),(17,17,17)); d=ImageDraw.Draw(im)
    pad=size*0.12
    d.rounded_rectangle((pad,pad,size-pad,size-pad),radius=int(size*0.18),fill=(245,245,245))
    try:
        f=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size*0.25))
    except: f=ImageFont.load_default()
    text='PPL'
    bbox=d.textbbox((0,0),text,font=f); tw=bbox[2]-bbox[0]; th=bbox[3]-bbox[1]
    d.text(((size-tw)/2,(size-th)/2-size*0.02),text,font=f,fill=(17,17,17))
    im.save(ICON_OUT/f'icon-{size}.png')

print('generated', len(list(OUT.glob('*.gif'))), 'exercise gifs')
