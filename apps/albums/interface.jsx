const { useRef, useState, useMemo, useEffect, useCallback, memo, Fragment } =
  React;

const bpps = {
  1: '1bit',
  2: '2bitbw',
  3: '3bit',
  4: '4bitmac',
  8: 'web',
  16: 'rgb565',
};

const diffusions = {
  none: 'Nearest color (flat)',
  random1: 'Random small',
  random2: 'Random large',
  error: 'Error Diffusion',
  errorrandom: 'Randomised Error Diffusion',
  bayer2: '2x2 Bayer',
  bayer4: '4x4 Bayer',
};

const checksum = (s) => {
  if (!s) return null;
  var chk = 0x12345678;
  var len = s.length;
  for (var i = 0; i < len; i++) {
    chk += s.charCodeAt(i) * (i + 1);
  }
  return (chk & 0xffffffff).toString(16);
};

const uid = () => {
  const ff = (s) => {
    const pt = (Math.random().toString(16) + '000000000').substr(2, 8);
    return s ? '-' + pt.substr(0, 4) + '-' + pt.substr(4, 4) : pt;
  };
  return ff() + ff(true) + ff(true) + ff();
};

const ViewOnBangleButton = memo(({ data, ...props }) => {
  const onClick = useCallback(() => {
    UART.eval('load(null)', () => {});
    UART.eval(
      `g.setColor(0x000000).setBgColor(0xFFFFFF).clear().drawImage(require("heatshrink").decompress(atob("${data}")));`,
      () => {}
    );
  }, [data]);
  return (
    <button className="button-full" onClick={onClick} {...props}>
      View on Bangle
    </button>
  );
});

const useFormField = ({ initial, key, onChange }) => {
  const [value, setValue] = useState(initial);
  const onChangeField = useCallback(
    (evt) => {
      setValue(evt.target.value);
    },
    [setValue]
  );

  useEffect(() => {
    onChange(key, value);
  }, [onChange, key, value]);

  return {
    name: key,
    value,
    onChange: onChangeField,
  };
};

const Hr = (props) => (
  <div
    style={{
      minHeight: '0.8rem',
      marginBottom: '1rem',
      boxShadow: '0 2px 4px -3px black',
    }}
    {...props}
  />
);

const UploadField = ({ onAddImage }) => {
  const onChange = useCallback(
    (evt) => {
      const files = evt.target.files;
      for (const file of files) {
        if (file.type.indexOf('image/') === 0) {
          onAddImage(file);
        }
      }
    },
    [onAddImage]
  );
  return (
    <div style={{ width: 0, height: 0, overflow: 'hidden' }}>
      <input type="file" onChange={onChange} />
    </div>
  );
};

const DropZone = ({ onAddImage }) => {
  const onDragOver = useCallback((evt) => {
    evt.preventDefault();
  }, []);

  const onDrop = useCallback(
    (evt) => {
      evt.preventDefault();
      const files = (
        evt.dataTransfer.items
          ? [...evt.dataTransfer.items].map((item) =>
              item.kind === 'file' ? item.getAsFile() : null
            )
          : [...evt.dataTransfer.files]
      ).filter((it) => !!it && it.type.indexOf('image') === 0);
      files.forEach((file) => onAddImage(file));
    },
    [onAddImage]
  );

  return (
    <div
      className="container"
      style={{
        position: 'sticky',
        bottom: 0,
      }}
    >
      <label
        onDragOver={onDragOver}
        onDrop={onDrop}
        style={{
          margin: 0,
          padding: '2rem',
          background: 'rgb(198 243 172)',
          borderRadius: '1rem',
          textAlign: 'center',
          boxShadow: 'black 0px -3px 4px -4px',
          cursor: 'pointer',
        }}
      >
        Drop image files <u>here</u> or click to add images
        <UploadField onAddImage={onAddImage} />
      </label>
    </div>
  );
};

const SvgFile = ({ file }) => {
  const [svg, setSvg] = useState();

  useEffect(() => {
    file.text().then(setSvg);
  }, [file, setSvg]);

  // convert a svg's paths to animatable vectors
  const positions = useMemo(() => {
    if (!svg) return [];

    const div = document.createElement('div');
    div.innerHTML = svg;

    const positions = [];
    div.querySelectorAll('path').forEach((node) => {
      const pos = [];

      const len = node.getTotalLength();
      for (let i = 0; i < len; i += 4) {
        const p = node.getPointAtLength(i);

        if (
          i === 0 ||
          i === len - 1 ||
          Math.abs(
            Math.sqrt(
              Math.pow(Math.abs(p.x - pos[pos.length - 1][0]), 2),
              Math.pow(Math.abs(p.y - pos[pos.length - 1][1]), 2)
            )
          ) > 1.0
        ) {
          pos.push([Math.round(p.x), Math.round(p.y)]);
        }
      }
      positions.push(pos);
    });
    return positions;
  }, [svg]);

  return <Code>{JSON.stringify(positions)}</Code>;
};

const Code = (props) => (
  <pre>
    <code className="code-content" {...props} />
  </pre>
);

const ImageSettings = memo(({ onChange }) => {
  const contrast = useFormField({ initial: 0, key: 'contrast', onChange });
  const brightness = useFormField({ initial: 0, key: 'brightness', onChange });
  const mode = useFormField({
    initial: bpps[1],
    key: 'mode',
    onChange,
  });
  const diffusion = useFormField({
    initial: diffusions.none,
    key: 'diffusion',
    onChange,
  });

  return (
    <form>
      <div>
        <label htmlFor="inp-contrast">Contrast</label>
        <input
          style={{ width: '100%' }}
          id="inp-contrast"
          {...contrast}
          type="range"
          min="-255"
          max="255"
          step="0.001"
        />
        <label htmlFor="inp-brightness">Brightness</label>
        <input
          style={{ width: '100%' }}
          id="inp-brightness"
          {...brightness}
          type="range"
          min="-255"
          max="255"
          step="0.001"
        />
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        <label htmlFor="inp-mode">Mode</label>
        <select id="inp-mode" {...mode}>
          {Object.keys(bpps).map((k) => (
            <option key={k}>{bpps[k]}</option>
          ))}
        </select>
        <label htmlFor="inp-diffusion">Diffusion</label>
        <select id="inp-diffusion" {...diffusion}>
          {Object.keys(diffusions).map((k) => (
            <option key={k} value={k}>
              {diffusions[k]}
            </option>
          ))}
        </select>
      </div>
    </form>
  );
});

const ImageFile = ({ file, onAddToAlbum, removeImage }) => {
  const img = useRef();
  const canvas = useRef();

  const [data, setData] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({
    compression: true,
    updateCanvas: true,
    output: 'raw',
  });
  const src = useMemo(() => URL.createObjectURL(file), [file]);

  const onChangeSettings = useCallback(
    (key, val) => {
      setSettings((settings) => ({ ...settings, [key]: val }));
    },
    [setSettings]
  );

  useEffect(() => {
    if (!loaded) return;
    const ctx = canvas.current.getContext('2d');

    var hRatio = canvas.current.width / img.current.width;
    var vRatio = canvas.current.height / img.current.height;
    var ratio = Math.min(hRatio, vRatio);
    var centerShift_x = (canvas.current.width - img.current.width * ratio) / 2;
    var centerShift_y =
      (canvas.current.height - img.current.height * ratio) / 2;
    ctx.clearRect(0, 0, canvas.current.width, canvas.current.height);
    ctx.drawImage(
      img.current,
      0,
      0,
      img.current.width,
      img.current.height,
      centerShift_x,
      centerShift_y,
      img.current.width * ratio,
      img.current.height * ratio
    );

    setData(btoa(imageconverter.canvastoString(canvas.current, settings)));
  }, [setData, canvas, img, file, settings, loaded]);

  return (
    <article>
      <h1 style={{ margin: 0, fontSize: '100%' }}>{file.name}</h1>
      <div className="row">
        <div>
          <img
            src={src}
            onLoad={() => setLoaded(true)}
            style={{ width: '176px', height: 'auto' }}
          />
          <div style={{ overflow: 'hidden' }}>
            <img
              src={src}
              ref={img}
              onLoad={() => setLoaded(true)}
              style={{ position: 'absolute', display: 'none' }}
            />
          </div>
        </div>
        <div>
          <canvas ref={canvas} width={176} height={176} />
        </div>
      </div>
      <ImageSettings onChange={onChangeSettings} />
      {!!data && (
        <p style={{ display: 'flex' }}>
          {data.length} bytes
          <br />
          <ViewOnBangleButton data={data} />
          <br />
          <button
            onClick={() => {
              onAddToAlbum({ name: file.name, data });
              removeImage(file);
            }}
          >
            Add to album
          </button>
        </p>
      )}
    </article>
  );
};

const ListEntry = ({ file, onAddToAlbum, removeImage }) => {
  const isSvg = useMemo(() => file.type === 'image/svg+xml', [file.type]);
  return isSvg ? (
    <SvgFile file={file} />
  ) : (
    <ImageFile
      file={file}
      onAddToAlbum={onAddToAlbum}
      removeImage={removeImage}
    />
  );
};

const BangleConnect = ({
  albums,
  setAlbums,
  setBangleQueried,
  bangleQueried,
}) => {
  const checksums = useRef({
    current: checksum(JSON.stringify([])),
    original: checksum(JSON.stringify([])),
  });
  const [storageStats, setStorageStats] = useState();

  const convertToBangleJson = useCallback((albums) => {
    // sequential image data
    let dataStr = '';
    const jsonData = albums
      .map((album) => {
        // let's ignore empty albums
        if (!album.images || !album.images.length) return null;

        const keys = [];
        return {
          ...album,
          images: album.images.map((image) => {
            const offset = dataStr.length;
            dataStr += image.data || '';
            // let's ignore duplicate file names
            if (keys.includes(image.name)) {
              return null;
            }
            keys.push(image.name);
            return {
              name: image.name,
              offset,
              length: image.data.length,
            };
          }),
        };
      })
      .filter((a) => !!a);
    return { dataStr, jsonData };
  }, []);

  // let's convert album info to json and data for bangle
  const { jsonFile, dataFile } = useMemo(() => {
    // albums info data
    const { dataStr, jsonData } = convertToBangleJson(albums);
    const json = JSON.stringify(jsonData);

    checksums.current.current = checksum(json);

    return {
      jsonFile: json,
      dataFile: dataStr,
    };
  }, [albums, convertToBangleJson]);

  // to the albums data from bangle
  // read json and data files
  const getBangleData = useCallback(() => {
    UART.eval(
      'require("Storage").readJSON("albums.json.data")',
      (albums, err) => {
        if (err) {
          console.error(err);
          console.error('could not get albums json data file from bangle');
          return;
        }

        UART.eval('require("Storage").read("albums.data")', (data, err) => {
          if (!data || err) {
            console.error(
              'could not get albums image data file from bangle',
              err
            );
            return;
          }
          const _albums = albums
            .map((album) => {
              return !album || !album.images || !album.images.length
                ? null
                : {
                    ...album,
                    images: album.images
                      .map((image) =>
                        !image
                          ? null
                          : {
                              ...image,
                              data: data.substring(
                                image.offset,
                                image.offset + image.length
                              ),
                            }
                      )
                      .filter((i) => !!i),
                  };
            })
            .filter((a) => !!a);

          checksums.current.original = checksum(
            JSON.stringify(convertToBangleJson(_albums))
          );

          setAlbums(_albums);
          setBangleQueried(true);

          UART.eval('require("Storage").getStats()', (data) => {
            setStorageStats(data);
          });
        });
      }
    );
  }, [
    checksums,
    setAlbums,
    setStorageStats,
    setBangleQueried,
    convertToBangleJson,
  ]);

  const writeBangleData = useCallback(async () => {
    const dataChecksum = checksum(dataFile);
    UART.eval(
      `require("Storage").write("albums.json.data",'${jsonFile}');`,
      (data) => {
        console.log('wrote json data', data);
        UART.eval(
          `require('Storage').write('albums.data', '${dataFile}')`,
          (data) => {
            // let's test if result equals sent
            UART.eval(`require('Storage').read('albums.data')`, (data) => {
              // let's test if result equals sent
              if (dataChecksum !== checksum(data)) {
                // TODO
                console.error('not equal');
              } else {
                console.log('done');
              }
            });
          }
        );
      }
    );
  }, [jsonFile, dataFile]);

  return (
    <Fragment>
      <div
        style={{
          display: 'flex',
          position: 'sticky',
          top: 0,
          zIndex: 3,
          background: 'white',
        }}
      >
        <button className="button-full" onClick={getBangleData}>
          Get albums from Bangle
        </button>
        {!!bangleQueried && (
          <Fragment>
            <div style={{ flex: '1 1 100%' }} />
            <button
              disabled={
                checksums.current.original === checksums.current.current
              }
              style={{ marginLeft: 'auto', display: 'block' }}
              onClick={writeBangleData}
            >
              Upload
            </button>
          </Fragment>
        )}
      </div>
      <section className="container">
        {!!bangleQueried && !!storageStats && (
          <Fragment>
            <section>
              <h5 style={{ margin: 0 }}>Bangle Storage: </h5>

              <div
                style={{
                  display: 'flex',
                  background: 'red',
                  height: '2px',
                  margin: '0 0 2.5rem 0',
                }}
                title={`free space: ${
                  (100 / storageStats.totalBytes) * storageStats.freeBytes
                }%`}
              >
                <div
                  style={{
                    flex: `0 0 ${
                      (100 / storageStats.totalBytes) * storageStats.freeBytes
                    }%`,
                    background: 'green',
                    marginLeft: 'auto',
                  }}
                />
              </div>
            </section>
            <section>
              <h5 style={{ margin: 0 }}>File contents: </h5>
              <Code>{jsonFile}</Code>
              <Code>{dataFile}</Code>
            </section>
          </Fragment>
        )}
      </section>
    </Fragment>
  );
};

const AlbumImage = ({ data, name, removeFromAlbum }) => {
  const [url, setUrl] = useState(null);
  // let's convert our compressed espruino image to an url resource
  useEffect(() => {
    try {
      const buffer = new Uint8Array(
        atob(data)
          .split('')
          .map((c) => c.charCodeAt(0))
      );
      const rawData = heatshrink.decompress(buffer);
      let str = '';
      for (let n = 0; n < rawData.length; n++)
        str += String.fromCharCode(rawData[n]);
      const url = imageconverter.stringToImageURL(str);
      setUrl(url);
    } catch (err) {
      console.error(err.message);
    }
  }, [data, setUrl]);

  return (
    <div
      style={{
        margin: '.4em 0',
        display: 'flex',
        justifyContent: 'space-between',
      }}
    >
      <img src={url} width="176" height="176" />
      <div>
        <ViewOnBangleButton data={data} />
        <button
          className="button-full"
          onClick={() => {
            removeFromAlbum({ name });
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
};
const Album = ({ setAlbums, removeFromAlbum, id, name, images }) => {
  const ref = useRef();
  useEffect(() => {
    if (name === 'new') {
      ref.current.focus();
      ref.current.select();
    }
  }, [id, ref, name]);

  return (
    <section className="container">
      <label htmlFor="input_name">Name</label>
      <input
        ref={ref}
        id="input_name"
        value={name}
        onChange={(evt) => {
          setAlbums((albums) =>
            albums.map((a) =>
              a.id === id ? { ...a, name: evt.target.value } : { ...a }
            )
          );
        }}
      />
      {!!images &&
        images.map((image) => (
          <AlbumImage
            key={image.name}
            data={image.data}
            name={image.name}
            removeFromAlbum={removeFromAlbum}
          />
        ))}
    </section>
  );
};

const AlbumButton = ({ name, isCurrent, ...props }) => {
  const ref = useRef();
  useEffect(() => {
    if (!isCurrent) return;
    requestAnimationFrame(() => {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [ref, isCurrent]);
  return (
    <button
      ref={ref}
      style={{ margin: '0 .2rem' }}
      disabled={isCurrent}
      {...props}
    >
      {name}
    </button>
  );
};

const Main = () => {
  const [bangleQueried, setBangleQueried] = useState(false);
  const [images, setImages] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [currentAlbum, setCurrentAlbum] = useState();

  useEffect(() => {
    if (currentAlbum || !albums || !albums.length) return;
    setCurrentAlbum(albums[0].id);
  }, [albums, currentAlbum, setCurrentAlbum]);

  const addImage = useCallback(
    (image) => {
      setImages((images) => [
        ...images.filter((i) => i.name !== image.name),
        image,
      ]);
    },
    [setImages]
  );

  const removeImage = useCallback(
    (image) => {
      setImages((images) => [...images.filter((i) => i.name !== image.name)]);
    },
    [setImages]
  );

  const onAddToAlbum = useCallback(
    ({ name, data }) => {
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === currentAlbum
            ? { ...album, images: [...album.images, { name, data }] }
            : { ...album }
        )
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  const removeFromAlbum = useCallback(
    ({ name }) => {
      setAlbums((prev) =>
        prev.map((album) =>
          album.id === currentAlbum
            ? {
                ...album,
                images: [...album.images.filter((img) => img.name !== name)],
              }
            : album
        )
      );
    },
    [currentAlbum, setAlbums, setImages]
  );

  const createAlbum = useCallback(() => {
    const id = uid();
    setAlbums((albums) => [...albums, { id, name: 'new', images: [] }]);
    setCurrentAlbum(id);
  }, [setAlbums, setCurrentAlbum]);

  return (
    <main>
      <BangleConnect
        setAlbums={setAlbums}
        setCurrentAlbum={setCurrentAlbum}
        albums={albums}
        setBangleQueried={setBangleQueried}
        bangleQueried={bangleQueried}
      />

      {bangleQueried && (
        <div>
          <nav
            style={{
              position: 'sticky',
              top: '-1.8rem',
              zIndex: 2,
              boxShadow: '0 2px 4px -3px black',
            }}
          >
            <div className="container">
              <h2>Albums</h2>
              <div
                style={{
                  display: 'flex',
                  overflow: 'auto',
                  background: 'white',
                  margin: '0 -.2rem',
                }}
              >
                {albums.map(({ id, name }) => (
                  <AlbumButton
                    key={id}
                    name={name}
                    isCurrent={currentAlbum === id}
                    onClick={() => {
                      setCurrentAlbum(id);
                    }}
                  />
                ))}
                <button
                  style={{
                    position: 'sticky',
                    right: '.2em',
                    margin: '.2em',
                    marginLeft: 'auto',
                  }}
                  onClick={createAlbum}
                >
                  Create Album
                </button>
              </div>
            </div>
          </nav>
          {!!currentAlbum && (
            <Album
              setAlbums={setAlbums}
              removeFromAlbum={removeFromAlbum}
              {...albums.find((a) => a.id === currentAlbum)}
            />
          )}

          {(1 || !!currentAlbum) && (
            <div className="container">
              <section title="Picture for album">
                {images.map((file) => (
                  <ListEntry
                    key={file.name}
                    file={file}
                    onAddToAlbum={onAddToAlbum}
                    removeImage={removeImage}
                  />
                ))}
              </section>
            </div>
          )}

          <DropZone onAddImage={addImage} />
        </div>
      )}
    </main>
  );
};
const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render(<Main />);
