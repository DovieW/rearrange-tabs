dist:
	@mkdir -p dist
	@cp icon*.png manifest.json rearrange.js updated.html options.html options.js dist/
	@zip -r rearrange_tabs.zip dist/

clean:
	rm -fr ./dist/

.PHONY: dist clean
