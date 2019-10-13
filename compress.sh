#!/usr/bin/env bash

# PNG
if ! [ -x "$(command -v optipng)" ]; then
    echo 'Skip: optipng is not installed.'
else
    find static/ -name '*.png' -print0 | xargs -0 optipng -nc -nb -o7 -fix
    find themes/ -name '*.png' -print0 | xargs -0 optipng -nc -nb -o7 -fix
fi

# PNG 2
if ! [ -x "$(command -v pngcrush)" ]; then
    echo 'Skip: pngcrush is not installed.'
else
    for png in `find $1 -name "*.png"`;
    do
        echo "crushing $png"    
        pngcrush -brute "$png" temp.png
        mv -f temp.png $png
    done;
fi

# JPG
if ! [ -x "$(command -v jpegoptim)" ]; then
    echo 'Skip: jpegoptim is not installed.'
else
    find static/ -type f -name "*.jpg" -o -name "*.JPG" | xargs jpegoptim -f --strip-all
    find themes/ -type f -name "*.jpg" -o -name "*.JPG" | xargs jpegoptim -f --strip-all    
fi
