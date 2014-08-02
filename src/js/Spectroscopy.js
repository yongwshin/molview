/*!
MolView v2.2 (http://molview.org)
Copyright (c) 2014, Herman Bergwerf
ALL RIGHTS RESERVED
*/

var Spectroscopy = {
    data: {},
    spectrum: undefined,
    spectrum_ratio: 1 / .3,

    init: function()
    {
        $(window).on("resize", function()
        {
            if($("#spectra-dialog").is(":visible"))
            {
                Spectroscopy.resize();
            }
        });

        $("#spectrum-select").on("change", function()
        {
            Spectroscopy.load($("#spectrum-select").val());
        });

        if(MolView.mobile)
        {
            //enable mobile scrolling
            $("#spectrum-wrapper").on("touchmove", function(e)
            {
                e.stopImmediatePropagation();
            });

            this.spectrum_ratio = 1 / .5;
            this.spectrum = new ChemDoodle.ObserverCanvas("spectrum-canvas", 100, 100);
        }
        else this.spectrum = new ChemDoodle.SeekerCanvas("spectrum-canvas", 100, 100, ChemDoodle.SeekerCanvas.SEEK_PLOT);

        this.spectrum.specs.plots_showYAxis = true;
        this.spectrum.specs.plots_flipXAxis = true;
        this.spectrum.specs.plots_showGrid = true;
        this.spectrum.specs.backgroundColor = "#ffffff";
        this.spectrum.emptyMessage = "No spectrum selected";
    },

    update: function(smiles)
    {
        if(this.smiles != smiles && smiles != "")
        {
            this.data = {};

            $("#spectrum").addClass("loading");
            $("#spectrum-select").html('<option value="loading" disabled selected style="display:none;">Loading&hellip;</option>').val("loading");
            this.print("No spectrum selected");

            //update available spectra
            function no_spectra()
            {
                $("#spectrum-select").append('<option value="default" disabled selected style="display:none;">No spectra</option>');
                $("#spectrum-select").append('<option value="nmrdb">H1-NMR prediction</option>');
                $("#spectrum").removeClass("loading");
            }

            ChemProps.getProperty("cas", function(cas)
            {
                Request.NIST.lookup(cas, function(data)
                {
                    $("#spectrum-select").empty();
                    $("#spectrum-select").append('<option value="default" disabled selected style="display:none;">Choose a spectrum</option>');

                    if(data.mass) $("#spectrum-select").append('<option value="nist-mass">Mass spectrum</option>');

                    if(data.ir !== undefined)
                    {
                        for(var i = 0; i < data.ir.length; i++)
                        {
                            $("#spectrum-select").append('<option value="nist-ir-'
                                + data.ir[i].i + '">IR spectrum [' + data.ir[i].state + ']</option>');
                        }
                    }

                    //if(data.uvvis) $("#spectrum-select").append('<option value="nist-uvvis">UV-Visible spectrum</option>');
                    $("#spectrum-select").append('<option value="nmrdb">H1-NMR prediction</option>');

                    $("#spectrum-select").val("default");
                    $("#spectrum").removeClass("loading");
                }, no_spectra);
            }, no_spectra);
        }
    },

    load: function(type)
    {
        /*
        Accepted types:
        - nmrdb
        - nist-mass
        - nist-ir-{i}
        - nist-uvvis (not supported yet)
        */

        this.print("Loading\u2026");
        $("#spectrum").addClass("loading");

        function display_nmrdb()
        {
            var spectrum = ChemDoodle.readJCAMP(Spectroscopy.data.nmrdb);
            spectrum.title = ucfirst(humanize(spectrum.title));
            spectrum.yUnit = ucfirst(humanize(spectrum.yUnit));
            Spectroscopy.spectrum.specs.plots_flipXAxis = true;
            Spectroscopy.spectrum.loadSpectrum(spectrum);
            $("#spectrum").removeClass("loading");
        }

        function display_nist_spectrum()
        {
            /*
            For UV-Vis support (using js/lib/jcamp-dx.js):
            var spectrum = new jdx_parse();
            spectrum.load(Spectroscopy.data[type], 0, true);
            */

            var spectrum = ChemDoodle.readJCAMP(Spectroscopy.data[type]);
            spectrum.title = ucfirst(humanize(spectrum.title));
            spectrum.yUnit = ucfirst(humanize(spectrum.yUnit));

            if(type == "nist-mass") Spectroscopy.spectrum.specs.plots_flipXAxis = false;
            else Spectroscopy.spectrum.specs.plots_flipXAxis = true;

            Spectroscopy.spectrum.loadSpectrum(spectrum);
            $("#spectrum").removeClass("loading");
        }

        if(type == "nmrdb")
        {
            if(!this.data["nmrdb"])
            {
                ChemProps.getProperty("smiles", function(smiles)
                {
                    Request.NMRdb.prediction(smiles, function(jcamp)
                    {
                        Spectroscopy.data.nmrdb = jcamp;
                        display_nmrdb();
                    }, function()
                    {
                        Spectroscopy.print("Spectrum unavailable");
                    });
                });
            }
            else display_nmrdb();
        }
        else if(type.indexOf("nist" != -1))
        {
            ChemProps.getProperty("cas", function(cas)
            {
                if(!Spectroscopy.data[type])
                {
                    Request.NIST.spectrum(cas, type.substr(5), function(jcamp)
                    {
                        Spectroscopy.data[type] = jcamp;
                        display_nist_spectrum();
                    }, function()
                    {
                        Spectroscopy.print("Spectrum unavailable");
                    });
                }
                else display_nist_spectrum();
            });
        }
    },

    print: function(str)
    {
        Spectroscopy.spectrum.emptyMessage = str;
        Spectroscopy.spectrum.loadSpectrum(null);
    },

    resize: function()
    {
        var w = $("#spectrum").width();
        var h = Math.round(w / Spectroscopy.spectrum_ratio);
        $("#spectrum-wrapper").css({
            "width": w, "height": h
        });
        Spectroscopy.spectrum.resize(w * (MolView.mobile ? 2 : 1), h * (MolView.mobile ? 2 : 1));
    },
};
